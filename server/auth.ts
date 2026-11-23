import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { db, getSettingValue } from './db.ts';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DB_ADMIN_HASH_KEY = 'admin_password_hash';

export function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPasswordScrypt(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const expectedBuf = Buffer.from(keyHex, 'hex');
  const actualBuf = crypto.scryptSync(password, salt, expectedBuf.length);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

function timingSafeCompareStrings(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function isAdminPasswordConfigured(): boolean {
  if (process.env.ADMIN_PASSWORD_HASH && process.env.ADMIN_PASSWORD_HASH.trim().length > 0) {
    return true;
  }
  if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim().length > 0) {
    return true;
  }
  const dbHash = getSettingValue(DB_ADMIN_HASH_KEY);
  return Boolean(dbHash && dbHash.trim().length > 0);
}

export function verifyAdminPassword(password: string): boolean {
  const envHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (envHash) {
    return verifyPasswordScrypt(password, envHash);
  }

  const envPassword = process.env.ADMIN_PASSWORD?.trim();
  if (envPassword) {
    return timingSafeCompareStrings(password, envPassword);
  }

  const dbHash = getSettingValue(DB_ADMIN_HASH_KEY)?.trim();
  if (dbHash) {
    return verifyPasswordScrypt(password, dbHash);
  }

  return false;
}

export function setupInitialAdminPassword(password: string): { ok: true; token: string } | { ok: false; error: string } {
  if (process.env.ADMIN_PASSWORD_HASH?.trim() || process.env.ADMIN_PASSWORD?.trim()) {
    return { ok: false, error: 'Пароль администратора уже задан в переменных окружения.' };
  }

  const passwordHash = hashPasswordScrypt(password);
  const now = new Date().toISOString();

  const claimTx = db.transaction(() => {
    const existing = db
      .prepare('SELECT value FROM company_settings WHERE key = ?')
      .get(DB_ADMIN_HASH_KEY) as { value: string } | undefined;

    if (existing && existing.value.trim().length > 0) {
      return false;
    }

    db.prepare(`
      INSERT INTO company_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO NOTHING
    `).run(DB_ADMIN_HASH_KEY, passwordHash, now);

    return true;
  });

  const claimed = claimTx();
  if (!claimed) {
    return { ok: false, error: 'Пароль администратора уже настроен.' };
  }

  const token = createAdminSession();
  return { ok: true, token };
}

export function pruneExpiredSessions(): void {
  const now = new Date().toISOString();
  db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').run(now);
}

export function createAdminSession(): string {
  pruneExpiredSessions();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  db.prepare(
    'INSERT INTO admin_sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)'
  ).run(tokenHash, now.toISOString(), expiresAt.toISOString());

  return rawToken;
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  const match = authHeader.match(/^Bearer\s+([a-fA-F0-9]{32,128})$/);
  return match ? match[1] : null;
}

export function validateSessionToken(token: string | null): boolean {
  if (!token) return false;
  pruneExpiredSessions();
  const tokenHash = hashSessionToken(token);
  const now = new Date().toISOString();
  const row = db
    .prepare('SELECT token_hash FROM admin_sessions WHERE token_hash = ? AND expires_at > ?')
    .get(tokenHash, now) as { token_hash: string } | undefined;
  return Boolean(row);
}

export function revokeSessionToken(token: string | null): void {
  if (!token) return;
  const tokenHash = hashSessionToken(token);
  db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!validateSessionToken(token)) {
    res.status(401).json({ error: 'Требуется авторизация администратора' });
    return;
  }
  next();
}
