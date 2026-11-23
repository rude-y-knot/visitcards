import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { CompanySettings, Employee } from '../src/types.ts';
import { DEFAULT_COMPANY_SETTINGS, INITIAL_EMPLOYEES } from '../src/data.ts';
import type { CompanySettingsInput, EmployeeInput, EmployeeUpdateInput } from './validation.ts';

interface EmployeeRow {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  department: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  telegram: string;
  whatsapp: string;
  max_messenger: number;
  is_active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const resolvedDbPath = process.env.DB_PATH
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.resolve(process.cwd(), 'data', 'cards.db');

fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true });

export const db = new Database(resolvedDbPath);
export const DB_STORAGE_PATH = resolvedDbPath;

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT 'Маркетинг',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    website TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    telegram TEXT NOT NULL DEFAULT '',
    whatsapp TEXT NOT NULL DEFAULT '',
    max_messenger INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_employees_active_sort
    ON employees (is_active, sort_order, last_name);

  CREATE TABLE IF NOT EXISTS company_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires
    ON admin_sessions (expires_at);
`);

function mapRowToEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    title: row.title,
    department: row.department,
    phone: row.phone,
    email: row.email,
    website: row.website,
    address: row.address,
    telegram: row.telegram || undefined,
    whatsapp: row.whatsapp || undefined,
    maxMessenger: Boolean(row.max_messenger),
    isActive: Boolean(row.is_active),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function transliterateToSlug(text: string): string {
  const rus = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
  const eng = [
    'a', 'b', 'v', 'g', 'd', 'e', 'yo', 'zh', 'z', 'i', 'y', 'k', 'l', 'm', 'n', 'o',
    'p', 'r', 's', 't', 'u', 'f', 'kh', 'ts', 'ch', 'sh', 'shch', '', 'y', '', 'e', 'yu', 'ya',
  ];
  return text
    .toLowerCase()
    .split('')
    .map((char) => {
      const idx = rus.indexOf(char);
      return idx !== -1 ? eng[idx] : char;
    })
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

const stmtCheckId = db.prepare('SELECT 1 FROM employees WHERE id = ?');

export function generateUniqueEmployeeId(firstName: string, lastName: string, preferredId?: string): string {
  const base = (preferredId && preferredId.trim()) || transliterateToSlug(`${firstName}-${lastName}`) || 'employee';
  if (!stmtCheckId.get(base)) {
    return base;
  }
  let suffix = 2;
  while (stmtCheckId.get(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

function seedInitialData() {
  const now = new Date().toISOString();

  const seedSettingsTx = db.transaction(() => {
    const insertSetting = db.prepare(
      'INSERT OR IGNORE INTO company_settings (key, value, updated_at) VALUES (?, ?, ?)'
    );
    insertSetting.run('companyName', DEFAULT_COMPANY_SETTINGS.companyName, now);
    insertSetting.run('companyPhone', DEFAULT_COMPANY_SETTINGS.companyPhone, now);
    insertSetting.run('companyWebsite', DEFAULT_COMPANY_SETTINGS.companyWebsite, now);
    insertSetting.run('companyAddress', DEFAULT_COMPANY_SETTINGS.companyAddress, now);
  });
  seedSettingsTx();

  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM employees').get() as { cnt: number };
  if (countRow.cnt === 0) {
    const insertEmployee = db.prepare(`
      INSERT INTO employees (
        id, first_name, last_name, title, department, phone, email, website,
        address, telegram, whatsapp, max_messenger, is_active, sort_order,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedEmployeesTx = db.transaction((items: Employee[]) => {
      items.forEach((emp, idx) => {
        const slug = generateUniqueEmployeeId(emp.firstName, emp.lastName, emp.id);
        insertEmployee.run(
          slug,
          emp.firstName,
          emp.lastName,
          emp.title || 'Сотрудник',
          emp.department || 'Маркетинг',
          emp.phone || '',
          emp.email || '',
          emp.website || DEFAULT_COMPANY_SETTINGS.companyWebsite,
          emp.address || DEFAULT_COMPANY_SETTINGS.companyAddress,
          emp.telegram || '',
          emp.whatsapp || '',
          emp.maxMessenger === false ? 0 : 1,
          emp.isActive === false ? 0 : 1,
          emp.sortOrder ?? idx,
          now,
          now
        );
      });
    });

    seedEmployeesTx(INITIAL_EMPLOYEES);
  }
}

seedInitialData();

export function getSettingValue(key: string): string | null {
  const row = db.prepare('SELECT value FROM company_settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row ? row.value : null;
}

export function setSettingValue(key: string, value: string): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO company_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, value, now);
}

export function getCompanySettings(): CompanySettings {
  const rows = db
    .prepare(
      `SELECT key, value FROM company_settings WHERE key IN ('companyName', 'companyPhone', 'companyWebsite', 'companyAddress')`
    )
    .all() as Array<{ key: string; value: string }>;

  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    companyName: map.get('companyName') ?? DEFAULT_COMPANY_SETTINGS.companyName,
    companyPhone: map.get('companyPhone') ?? DEFAULT_COMPANY_SETTINGS.companyPhone,
    companyWebsite: map.get('companyWebsite') ?? DEFAULT_COMPANY_SETTINGS.companyWebsite,
    companyAddress: map.get('companyAddress') ?? DEFAULT_COMPANY_SETTINGS.companyAddress,
  };
}

export function updateCompanySettings(input: CompanySettingsInput): CompanySettings {
  const now = new Date().toISOString();
  const upsert = db.prepare(`
    INSERT INTO company_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  const tx = db.transaction(() => {
    upsert.run('companyName', input.companyName, now);
    upsert.run('companyPhone', input.companyPhone, now);
    upsert.run('companyWebsite', input.companyWebsite, now);
    upsert.run('companyAddress', input.companyAddress, now);
  });
  tx();

  return getCompanySettings();
}

export function listEmployees(includeArchived = true): Employee[] {
  const rows = includeArchived
    ? (db
        .prepare('SELECT * FROM employees ORDER BY is_active DESC, sort_order ASC, last_name ASC')
        .all() as EmployeeRow[])
    : (db
        .prepare('SELECT * FROM employees WHERE is_active = 1 ORDER BY sort_order ASC, last_name ASC')
        .all() as EmployeeRow[]);
  return rows.map(mapRowToEmployee);
}

export function getActiveEmployeeById(id: string): Employee | null {
  const row = db
    .prepare('SELECT * FROM employees WHERE id = ? AND is_active = 1')
    .get(id) as EmployeeRow | undefined;
  return row ? mapRowToEmployee(row) : null;
}

export function getEmployeeById(id: string): Employee | null {
  const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as EmployeeRow | undefined;
  return row ? mapRowToEmployee(row) : null;
}

export function createEmployee(input: EmployeeInput): Employee {
  const now = new Date().toISOString();
  const settings = getCompanySettings();
  const maxOrderRow = db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM employees')
    .get() as { max_order: number };

  const id = generateUniqueEmployeeId(input.firstName, input.lastName, input.id);
  const sortOrder = input.sortOrder ?? maxOrderRow.max_order + 1;

  db.prepare(`
    INSERT INTO employees (
      id, first_name, last_name, title, department, phone, email, website,
      address, telegram, whatsapp, max_messenger, is_active, sort_order,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.firstName,
    input.lastName,
    input.title || 'Сотрудник',
    input.department || 'Маркетинг',
    input.phone || '',
    input.email || '',
    input.website || settings.companyWebsite,
    input.address || settings.companyAddress,
    input.telegram || '',
    input.whatsapp || '',
    input.maxMessenger === false ? 0 : 1,
    input.isActive === false ? 0 : 1,
    sortOrder,
    now,
    now
  );

  return getEmployeeById(id)!;
}

export function updateEmployee(id: string, input: EmployeeUpdateInput): Employee | null {
  const existing = getEmployeeById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE employees
    SET first_name = ?,
        last_name = ?,
        title = ?,
        department = ?,
        phone = ?,
        email = ?,
        website = ?,
        address = ?,
        telegram = ?,
        whatsapp = ?,
        max_messenger = ?,
        is_active = ?,
        sort_order = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    input.firstName,
    input.lastName,
    input.title,
    input.department,
    input.phone,
    input.email,
    input.website,
    input.address,
    input.telegram || '',
    input.whatsapp || '',
    input.maxMessenger === false ? 0 : 1,
    input.isActive !== undefined ? (input.isActive ? 1 : 0) : existing.isActive ? 1 : 0,
    input.sortOrder ?? existing.sortOrder ?? 0,
    now,
    id
  );

  return getEmployeeById(id);
}

export function setEmployeeArchiveState(id: string, isActive: boolean): Employee | null {
  const existing = getEmployeeById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  db.prepare('UPDATE employees SET is_active = ?, updated_at = ? WHERE id = ?').run(
    isActive ? 1 : 0,
    now,
    id
  );
  return getEmployeeById(id);
}

export function deleteEmployee(id: string): boolean {
  const result = db.prepare('DELETE FROM employees WHERE id = ?').run(id);
  return result.changes > 0;
}

export function reorderEmployees(orderedIds: string[]): void {
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE employees SET sort_order = ?, updated_at = ? WHERE id = ?');
  const tx = db.transaction((ids: string[]) => {
    ids.forEach((empId, idx) => {
      stmt.run(idx, now, empId);
    });
  });
  tx(orderedIds);
}

export function parseCsvText(text: string): string[][] {
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentValue = '';

  const firstLine = cleanText.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let separator = ',';
  if (semiCount > commaCount && semiCount > tabCount) {
    separator = ';';
  } else if (tabCount > commaCount && tabCount > semiCount) {
    separator = '\t';
  }

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentValue += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentValue += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === separator) {
      row.push(currentValue.trim());
      currentValue = '';
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && nextChar === '\n') {
        i += 1;
      }
      row.push(currentValue.trim());
      if (row.some((v) => v !== '')) {
        lines.push(row);
      }
      row = [];
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  if (currentValue !== '' || row.length > 0) {
    row.push(currentValue.trim());
    if (row.some((v) => v !== '')) {
      lines.push(row);
    }
  }

  return lines;
}

export function importEmployeesFromCsv(csvText: string, mode: 'merge' | 'replace'): {
  imported: number;
  updated: number;
  skipped: number;
} {
  const rows = parseCsvText(csvText);
  if (rows.length === 0) {
    return { imported: 0, updated: 0, skipped: 0 };
  }

  const settings = getCompanySettings();
  const indices = {
    id: -1,
    firstName: 0,
    lastName: 1,
    phone: 2,
    email: 3,
    title: 4,
    department: 5,
    website: 6,
    address: 7,
    telegram: -1,
    whatsapp: -1,
    maxMessenger: -1,
    isActive: -1,
  };

  let startIndex = 0;
  const firstRowLower = rows[0].map((h) => h.toLowerCase().trim());
  const hasHeaders = firstRowLower.some(
    (h) =>
      h.includes('имя') ||
      h.includes('фамилия') ||
      h.includes('телефон') ||
      h.includes('почта') ||
      h.includes('email') ||
      h.includes('должность')
  );

  if (hasHeaders) {
    firstRowLower.forEach((header, index) => {
      if (header === 'id' || header === 'slug' || header === 'код') indices.id = index;
      else if (header.includes('имя')) indices.firstName = index;
      else if (header.includes('фамилия')) indices.lastName = index;
      else if (header.includes('телефон') || header.includes('тел')) indices.phone = index;
      else if (header.includes('почта') || header.includes('email') || header.includes('mail')) indices.email = index;
      else if (header.includes('должность') || header.includes('роль')) indices.title = index;
      else if (header.includes('департамент') || header.includes('отдел')) indices.department = index;
      else if (header.includes('сайт')) indices.website = index;
      else if (header.includes('адрес')) indices.address = index;
      else if (header.includes('telegram') || header.includes('телеграм')) indices.telegram = index;
      else if (header.includes('whatsapp') || header.includes('ватсап')) indices.whatsapp = index;
      else if (header.includes('макс') || header.includes('max')) indices.maxMessenger = index;
      else if (header.includes('статус') || header.includes('актив')) indices.isActive = index;
    });
    startIndex = 1;
  }

  const now = new Date().toISOString();
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  const insertStmt = db.prepare(`
    INSERT INTO employees (
      id, first_name, last_name, title, department, phone, email, website,
      address, telegram, whatsapp, max_messenger, is_active, sort_order,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateStmt = db.prepare(`
    UPDATE employees
    SET first_name = ?,
        last_name = ?,
        title = ?,
        department = ?,
        phone = ?,
        email = ?,
        website = ?,
        address = ?,
        telegram = ?,
        whatsapp = ?,
        max_messenger = ?,
        is_active = ?,
        updated_at = ?
    WHERE id = ?
  `);

  const tx = db.transaction(() => {
    if (mode === 'replace') {
      db.prepare('DELETE FROM employees').run();
    }

    const maxOrderRow = db
      .prepare('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM employees')
      .get() as { max_order: number };
    let nextOrder = maxOrderRow.max_order + 1;

    for (let i = startIndex; i < rows.length; i++) {
      const fields = rows[i];
      const getVal = (idx: number, fallback = '') =>
        idx >= 0 && idx < fields.length ? fields[idx].trim() : fallback;

      const firstName = getVal(indices.firstName);
      const lastName = getVal(indices.lastName);
      if (!firstName || !lastName) {
        skipped += 1;
        continue;
      }

      const rawId = getVal(indices.id).replace(/[^a-zA-Z0-9_-]/g, '');
      const phone = getVal(indices.phone);
      const email = getVal(indices.email);
      const title = getVal(indices.title) || 'Сотрудник';
      const department = getVal(indices.department) || 'Маркетинг';
      const websiteRaw = getVal(indices.website, settings.companyWebsite);
      const website = /^\s*(javascript|data|vbscript|file):/i.test(websiteRaw)
        ? settings.companyWebsite
        : websiteRaw;
      const address = getVal(indices.address, settings.companyAddress);
      const telegram = getVal(indices.telegram)
        .replace(/^@+/, '')
        .replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '')
        .trim();
      const whatsappRaw =
        indices.whatsapp !== -1 ? getVal(indices.whatsapp) : phone.replace(/[^0-9]/g, '');
      const whatsapp = whatsappRaw.replace(/[^0-9]/g, '');

      const rawMax = indices.maxMessenger !== -1 ? getVal(indices.maxMessenger).toLowerCase() : '';
      const maxMessenger =
        indices.maxMessenger !== -1
          ? !['', '0', 'нет', 'no', 'false', '-'].includes(rawMax)
          : true;

      const rawActive = indices.isActive !== -1 ? getVal(indices.isActive).toLowerCase() : '';
      const isActive =
        indices.isActive !== -1
          ? !['0', 'нет', 'no', 'false', 'архив', 'archived'].includes(rawActive)
          : true;

      const candidateSlug = rawId || transliterateToSlug(`${firstName}-${lastName}`) || `emp-${i}`;
      const existing = mode === 'merge' ? getEmployeeById(candidateSlug) : null;

      if (existing) {
        updateStmt.run(
          firstName,
          lastName,
          title,
          department,
          phone,
          email,
          website,
          address,
          telegram,
          whatsapp,
          maxMessenger ? 1 : 0,
          isActive ? 1 : 0,
          now,
          existing.id
        );
        updated += 1;
      } else {
        const finalId = generateUniqueEmployeeId(firstName, lastName, candidateSlug);
        insertStmt.run(
          finalId,
          firstName,
          lastName,
          title,
          department,
          phone,
          email,
          website,
          address,
          telegram,
          whatsapp,
          maxMessenger ? 1 : 0,
          isActive ? 1 : 0,
          nextOrder,
          now,
          now
        );
        nextOrder += 1;
        imported += 1;
      }
    }
  });

  tx();
  return { imported, updated, skipped };
}

function escapeCsvCell(value: string): string {
  let safe = value ?? '';
  if (/^[=@\t\r]/.test(safe) || (/^[+-]/.test(safe) && !/^[+-][0-9\s().-]+$/.test(safe))) {
    safe = `'${safe}`;
  }
  if (/[;"\r\n,]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function exportEmployeesToCsv(): string {
  const employees = listEmployees(true);
  const headers = [
    'ID',
    'Имя',
    'Фамилия',
    'Телефон',
    'Почта',
    'Должность',
    'Отдел',
    'Сайт',
    'Адрес',
    'Telegram',
    'WhatsApp',
    'Макс',
    'Статус',
  ];

  const rows = employees.map((emp) =>
    [
      emp.id,
      emp.firstName,
      emp.lastName,
      emp.phone,
      emp.email,
      emp.title,
      emp.department,
      emp.website,
      emp.address,
      emp.telegram || '',
      emp.whatsapp || '',
      emp.maxMessenger === false ? 'Нет' : 'Да',
      emp.isActive === false ? 'Архив' : 'Активен',
    ]
      .map(escapeCsvCell)
      .join(';')
  );

  return `\uFEFF${[headers.join(';'), ...rows].join('\r\n')}`;
}
