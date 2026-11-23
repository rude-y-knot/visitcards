import { z } from 'zod';

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,80}$/;
const DANGEROUS_SCHEME_REGEX = /^\s*(javascript|data|vbscript|file):/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const safeWebsiteSchema = z
  .string()
  .trim()
  .max(200)
  .refine((val) => !val || !DANGEROUS_SCHEME_REGEX.test(val), {
    message: 'Недопустимая схема URL',
  });

const safeEmailSchema = z
  .string()
  .trim()
  .max(160)
  .refine((val) => !val || EMAIL_REGEX.test(val), {
    message: 'Некорректный формат e-mail',
  });

const safeTelegramSchema = z
  .string()
  .trim()
  .max(80)
  .transform((val) => val.replace(/^@+/, '').replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '').trim())
  .refine((val) => !val || /^[a-zA-Z0-9_]{3,64}$/.test(val), {
    message: 'Некорректный username Telegram',
  });

const safeWhatsappSchema = z
  .string()
  .trim()
  .max(40)
  .transform((val) => val.replace(/[^0-9]/g, ''))
  .refine((val) => !val || (val.length >= 7 && val.length <= 16), {
    message: 'Некорректный номер WhatsApp',
  });

export const employeeIdSchema = z
  .string()
  .trim()
  .regex(SAFE_ID_REGEX, 'Некорректный идентификатор визитки');

export const employeeInputSchema = z.object({
  id: employeeIdSchema.optional(),
  firstName: z.string().trim().min(1, 'Укажите имя').max(80),
  lastName: z.string().trim().min(1, 'Укажите фамилию').max(80),
  title: z.string().trim().max(160).default('Сотрудник'),
  department: z.string().trim().min(1, 'Укажите отдел').max(80).default('Маркетинг'),
  phone: z.string().trim().max(40).default(''),
  email: safeEmailSchema.default(''),
  website: safeWebsiteSchema.default('www.magmahome.ru'),
  address: z.string().trim().max(260).default(''),
  telegram: safeTelegramSchema.optional().default(''),
  whatsapp: safeWhatsappSchema.optional().default(''),
  maxMessenger: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(100000).optional(),
});

export const employeeUpdateSchema = z.object({
  firstName: z.string().trim().min(1, 'Укажите имя').max(80),
  lastName: z.string().trim().min(1, 'Укажите фамилию').max(80),
  title: z.string().trim().max(160).default(''),
  department: z.string().trim().min(1, 'Укажите отдел').max(80),
  phone: z.string().trim().max(40).default(''),
  email: safeEmailSchema.default(''),
  website: safeWebsiteSchema.default(''),
  address: z.string().trim().max(260).default(''),
  telegram: safeTelegramSchema.optional().default(''),
  whatsapp: safeWhatsappSchema.optional().default(''),
  maxMessenger: z.boolean().optional().default(true),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
});

export const archiveSchema = z.object({
  isActive: z.boolean(),
});

export const reorderSchema = z.object({
  orderedIds: z.array(employeeIdSchema).min(1).max(2000),
});

export const importCsvSchema = z.object({
  csvText: z.string().min(1, 'CSV пуст').max(1_000_000),
  mode: z.enum(['merge', 'replace']).default('merge'),
});

export const companySettingsSchema = z.object({
  companyName: z.string().trim().min(1, 'Укажите название компании').max(120),
  companyPhone: z.string().trim().max(40).default(''),
  companyWebsite: safeWebsiteSchema.default('www.magmahome.ru'),
  companyAddress: z.string().trim().max(260).default(''),
});

export const loginSchema = z.object({
  password: z.string().min(1, 'Введите пароль').max(200),
});

export const setupPasswordSchema = z.object({
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов').max(200),
});

export type EmployeeInput = z.infer<typeof employeeInputSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
