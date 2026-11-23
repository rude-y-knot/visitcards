import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DB_STORAGE_PATH,
  createEmployee,
  deleteEmployee,
  exportEmployeesToCsv,
  getActiveEmployeeById,
  getCompanySettings,
  importEmployeesFromCsv,
  listEmployees,
  reorderEmployees,
  setEmployeeArchiveState,
  updateCompanySettings,
  updateEmployee,
} from './server/db.ts';
import {
  createAdminSession,
  extractBearerToken,
  isAdminPasswordConfigured,
  requireAdmin,
  revokeSessionToken,
  setupInitialAdminPassword,
  validateSessionToken,
  verifyAdminPassword,
} from './server/auth.ts';
import {
  archiveSchema,
  companySettingsSchema,
  employeeIdSchema,
  employeeInputSchema,
  employeeUpdateSchema,
  importCsvSchema,
  loginSchema,
  reorderSchema,
  setupPasswordSchema,
} from './server/validation.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много попыток входа. Попробуйте через 15 минут.' },
  });

  // --- PUBLIC ROUTES ---

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      database: 'sqlite',
      storage: path.basename(DB_STORAGE_PATH),
    });
  });

  app.get('/api/settings/public', (_req, res) => {
    res.json({ settings: getCompanySettings() });
  });

  app.get('/api/cards/:id', (req, res) => {
    const idParsed = employeeIdSchema.safeParse(req.params.id);
    if (!idParsed.success) {
      res.status(400).json({ error: 'Некорректный идентификатор визитки' });
      return;
    }

    const employee = getActiveEmployeeById(idParsed.data);
    if (!employee) {
      res.status(404).json({ error: 'Визитка не найдена или находится в архиве' });
      return;
    }

    res.json({
      employee,
      settings: getCompanySettings(),
    });
  });

  app.get('/api/auth/status', (req, res) => {
    const configured = isAdminPasswordConfigured();
    const token = extractBearerToken(req);
    const authenticated = configured && validateSessionToken(token);
    res.json({
      needsSetup: !configured,
      authenticated,
    });
  });

  app.post('/api/auth/setup', authRateLimiter, (req, res) => {
    const parsed = setupPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Некорректный пароль' });
      return;
    }

    const result = setupInitialAdminPassword(parsed.data.password);
    if ('error' in result) {
      res.status(409).json({ error: result.error });
      return;
    }

    res.status(201).json({ token: result.token });
  });

  app.post('/api/auth/login', authRateLimiter, (req, res) => {
    if (!isAdminPasswordConfigured()) {
      res.status(409).json({ error: 'Сначала необходимо задать пароль администратора.' });
      return;
    }

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Введите пароль' });
      return;
    }

    if (!verifyAdminPassword(parsed.data.password)) {
      res.status(401).json({ error: 'Неверный пароль' });
      return;
    }

    const token = createAdminSession();
    res.json({ token });
  });

  // --- PROTECTED ADMIN ROUTES ---

  app.post('/api/auth/logout', requireAdmin, (req, res) => {
    const token = extractBearerToken(req);
    revokeSessionToken(token);
    res.json({ ok: true });
  });

  app.get('/api/employees', requireAdmin, (_req, res) => {
    res.json({
      employees: listEmployees(true),
      settings: getCompanySettings(),
    });
  });

  app.post('/api/employees', requireAdmin, (req, res) => {
    const parsed = employeeInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Ошибка валидации данных' });
      return;
    }

    const employee = createEmployee(parsed.data);
    res.status(201).json({ employee });
  });

  app.put('/api/employees/:id', requireAdmin, (req, res) => {
    const idParsed = employeeIdSchema.safeParse(req.params.id);
    if (!idParsed.success) {
      res.status(400).json({ error: 'Некорректный ID сотрудника' });
      return;
    }

    const parsed = employeeUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Ошибка валидации данных' });
      return;
    }

    const updated = updateEmployee(idParsed.data, parsed.data);
    if (!updated) {
      res.status(404).json({ error: 'Сотрудник не найден' });
      return;
    }

    res.json({ employee: updated });
  });

  app.patch('/api/employees/:id/archive', requireAdmin, (req, res) => {
    const idParsed = employeeIdSchema.safeParse(req.params.id);
    if (!idParsed.success) {
      res.status(400).json({ error: 'Некорректный ID сотрудника' });
      return;
    }

    const parsed = archiveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Некорректный статус архивации' });
      return;
    }

    const updated = setEmployeeArchiveState(idParsed.data, parsed.data.isActive);
    if (!updated) {
      res.status(404).json({ error: 'Сотрудник не найден' });
      return;
    }

    res.json({ employee: updated });
  });

  app.delete('/api/employees/:id', requireAdmin, (req, res) => {
    const idParsed = employeeIdSchema.safeParse(req.params.id);
    if (!idParsed.success) {
      res.status(400).json({ error: 'Некорректный ID сотрудника' });
      return;
    }

    const deleted = deleteEmployee(idParsed.data);
    if (!deleted) {
      res.status(404).json({ error: 'Сотрудник не найден' });
      return;
    }

    res.json({ ok: true });
  });

  app.post('/api/employees/reorder', requireAdmin, (req, res) => {
    const parsed = reorderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Некорректный список сортировки' });
      return;
    }

    reorderEmployees(parsed.data.orderedIds);
    res.json({ ok: true, employees: listEmployees(true) });
  });

  app.post('/api/employees/import-csv', requireAdmin, (req, res) => {
    const parsed = importCsvSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Некорректный CSV' });
      return;
    }

    const stats = importEmployeesFromCsv(parsed.data.csvText, parsed.data.mode);
    res.json({
      ...stats,
      employees: listEmployees(true),
    });
  });

  app.get('/api/employees/export-csv', requireAdmin, (_req, res) => {
    const csv = exportEmployeesToCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="magma_employees.csv"');
    res.send(csv);
  });

  app.put('/api/settings', requireAdmin, (req, res) => {
    const parsed = companySettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Некорректные реквизиты' });
      return;
    }

    const settings = updateCompanySettings(parsed.data);
    res.json({ settings });
  });

  // Unknown API routes return JSON 404
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // --- FRONTEND SERVING ---

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[magma-cards] Server listening on http://0.0.0.0:${PORT} (mode=${IS_PROD ? 'prod' : 'dev'})`);
  });
}

startServer().catch((err) => {
  console.error('[magma-cards] Failed to start server:', err);
  process.exit(1);
});
