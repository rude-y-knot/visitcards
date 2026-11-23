# Шаблон переноса реализации: мини-БД SQLite + админка + генератор PDF CMYK (50×90 / 90×50 мм) + автодеплой на VPS

Этот артефакт предназначен для **полного воспроизведения** реализованной системы электронных и печатных визиток в другом аналогичном проекте (React + Vite + TypeScript). Прикрепите этот файл к новому проекту и укажите в сообщении параметры из **Раздела 0** (название бренда, домен, репозиторий, цвета, порт API на VPS) — всё остальное будет реализовано один-в-один.

---

## 0. Параметры адаптации под новый проект (заполнить при переносе)

Если новый проект будет размещаться на **том же VPS Beget (`159.194.209.18`)**, обязательно задайте уникальные значения для порта API, имени `systemd`-сервиса, папки БД и SSH-ключа, чтобы проекты не конфликтовали между собой:

| Параметр | Эталон (`Стальное дело`) | Значение для нового проекта (пример) |
|---|---|---|
| Название компании | `Стальное дело` | `«<Новое название>»` |
| Домен визиток | `contact.sdmaf.ru` | `contact.<domain>.ru` |
| Основной сайт | `www.sdmaf.ru` | `www.<domain>.ru` |
| GitHub-репозиторий | `rude-y-knot/contact.sdmaf` | `rude-y-knot/<repo>` |
| Локальный порт API на VPS | `3010` | **`3011`** (следующий свободный порт!) |
| Имя `systemd`-сервиса | `contact-sdmaf-api` | `contact-<slug>-api` |
| Файл SQLite на VPS | `/var/lib/contact-sdmaf/cards.db` | `/var/lib/contact-<slug>/cards.db` |
| Файл окружения на VPS | `/etc/contact-sdmaf.env` | `/etc/contact-<slug>.env` |
| Папка деплоя на VPS | `/var/www/contact.sdmaf.ru` | `/var/www/contact.<domain>.ru` |
| Конфиг Nginx | `/etc/nginx/conf.d/contact.sdmaf.ru.conf` | `/etc/nginx/conf.d/contact.<domain>.ru.conf` |
| Комментарий SSH-ключа | `github-actions-contact-sdmaf` | `github-actions-contact-<slug>` |
| Фирменный акцент (HEX → CMYK) | `#70B84F` → `C:60 M:5 Y:85 K:0` | Заменить на акцентный цвет нового бренда |
| Фирменный тёмный (HEX → CMYK) | `#42444A` → `C:65 M:55 Y:50 K:45` | Заменить на основной тёмный цвет нового бренда |
| Векторный логотип | `src/components/Logo.tsx` → `logoGeometry.ts` | Перенести SVG-пути логотипа из нового проекта |
| Префикс PDF-файла | `SDMAF_<id>_..._CMYK.pdf` | `<BRAND>_<id>_..._CMYK.pdf` |

---

## 1. Зависимости, скрипты и шрифты

### 1.1. Установка npm-пакетов (одним вызовом)

```bash
npm install better-sqlite3 @types/better-sqlite3 zod express-rate-limit pdf-lib @pdf-lib/fontkit qrcode @types/qrcode opentype.js @types/opentype.js
```

*(Также в проекте должны присутствовать `express`, `@types/express`, `dotenv`, `tsx`, `esbuild`, `lucide-react`, `motion`.)*

### 1.2. Скрипты в `package.json`

```json
"scripts": {
  "dev": "tsx server.ts",
  "start": "node server.ts",
  "build": "vite build",
  "build:server": "esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=dist-server/server.mjs",
  "preview": "vite preview",
  "clean": "rm -rf dist dist-server server.js",
  "lint": "tsc --noEmit"
}
```

> Важно: в `src/data.ts` использовать `import type { Employee } from './types.ts';`, чтобы серверная часть работала и под `tsx`, и под нативным Node 22 (`node server.ts`), и при сборке через `esbuild`.

### 1.3. Кириллические TTF-шрифты для PDF (в `public/fonts/`)

Скачать статические TTF-файлы с полной кириллицей (используются `opentype.js` для перевода в кривые и `pdf-lib` для встраивания):

```bash
mkdir -p public/fonts
curl -fsSL "https://raw.githubusercontent.com/IBM/plex/master/packages/plex-sans/fonts/complete/ttf/IBMPlexSans-Regular.ttf" -o public/fonts/IBMPlexSans-Regular.ttf
curl -fsSL "https://raw.githubusercontent.com/IBM/plex/master/packages/plex-sans/fonts/complete/ttf/IBMPlexSans-Medium.ttf" -o public/fonts/IBMPlexSans-Medium.ttf
curl -fsSL "https://raw.githubusercontent.com/IBM/plex/master/packages/plex-sans/fonts/complete/ttf/IBMPlexSans-Bold.ttf" -o public/fonts/IBMPlexSans-Bold.ttf
```

### 1.4. `.env.example` и `.gitignore`

В `.env.example` (без реальных секретов):
```env
PORT=3000
DB_PATH=./data/cards.db
ADMIN_PASSWORD=
ADMIN_PASSWORD_HASH=
APP_URL="https://contact.<domain>.ru"
```

В `.gitignore` добавить:
```gitignore
dist-server/
data/
*.db
*.db-wal
*.db-shm
```

---

## 2. Серверная часть и мини-БД SQLite

### 2.1. Типы данных (`src/types.ts`)

Расширить `Employee` полями БД и добавить типы настроек и конструктора PDF:
- `Employee`: `id`, `firstName`, `lastName`, `phone`, `email`, `title`, `website`, `address`, `department`, `telegram?`, `whatsapp?`, `maxMessenger?`, `isActive?`, `sortOrder?`, `createdAt?`, `updatedAt?`.
- `CompanySettings`: `companyName`, `companyPhone`, `companyWebsite`, `companyAddress`.
- `PdfCardConfig`: `employeeId`, `overrides: Partial<Employee>`, `orientation: 'horizontal' | 'vertical'`, `sides: 'single' | 'double'`, `template: 'classic-light' | 'contrast-back' | 'minimal-grid'`, `qrMode: 'card-url' | 'vcard'`, `visibility`, `prepress`.

### 2.2. Слой базы данных (`server/db.ts`)

- Открытие SQLite через `better-sqlite3` по пути `process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'cards.db')` с автоматическим `fs.mkdirSync(..., { recursive: true })`.
- Обязательные pragma: `journal_mode = WAL`, `foreign_keys = ON`, `busy_timeout = 5000`.
- Таблицы:
  1. `employees` (`id TEXT PRIMARY KEY`, `first_name`, `last_name`, `title`, `department`, `phone`, `email`, `website`, `address`, `telegram`, `whatsapp`, `max_messenger INTEGER`, `is_active INTEGER`, `sort_order INTEGER`, `created_at`, `updated_at`) + индекс `(is_active, sort_order, last_name)`.
  2. `company_settings` (`key TEXT PRIMARY KEY`, `value TEXT NOT NULL`, `updated_at`).
  3. `admin_sessions` (`token_hash TEXT PRIMARY KEY`, `created_at`, `expires_at`).
- **Авто-seed при первом старте:** если в `employees` 0 записей, в одной транзакции вставляются стартовые сотрудники из `src/data.ts` и базовые реквизиты компании (`INSERT OR IGNORE`).
- **Генерация URL-слага:** транслитерация кириллицы `Имя-Фамилия` в `a-z0-9-` с автоматическим добавлением суффикса `-2`, `-3` при совпадении. При `UPDATE` поле `id` **не меняется**, чтобы распечатанные QR-коды оставались рабочими.
- Все запросы — строго через параметризованные `db.prepare(...)`.

### 2.3. Серверная авторизация (`server/auth.ts`)

- **Никаких зашитых паролей или хэшей на клиенте!**
- Проверка пароля на сервере (`crypto.scryptSync` + 16-байтная соль + `crypto.timingSafeEqual`):
  1. Приоритет 1: `process.env.ADMIN_PASSWORD_HASH` (формат `salt:hash`).
  2. Приоритет 2: `process.env.ADMIN_PASSWORD` (сравнение в постоянном времени).
  3. Приоритет 3: ключ `admin_password_hash` в таблице `company_settings`.
- **Одноразовая первичная настройка:** если ни env, ни запись в БД ещё не заданы, `GET /api/auth/status` возвращает `{ needsSetup: true, authenticated: false }`. Форма входа показывает экран создания пароля администратора (`POST /api/auth/setup`, минимум 6 символов), который в транзакции сохраняет `scrypt`-хэш в SQLite и сразу блокирует повторный вызов `/setup`.
- **Сессии:** 32-байтный случайный hex-токен (`crypto.randomBytes(32)`), в таблице `admin_sessions` хранится только его SHA-256 хэш, срок жизни 7 дней, просроченные чистятся автоматически.
- Клиент передаёт токен в заголовке `Authorization: Bearer <token>` и хранит его **только в оперативной памяти JS/React** (не в `localStorage`/`sessionStorage`).

### 2.4. Валидация (`server/validation.ts`) и Express-сервер (`server.ts`)

- `zod`-схемы для всех входных тел и URL-параметров (`id` строго `/^[a-zA-Z0-9_-]+$/`, блокировка `javascript:` / `data:` / `vbscript:` в полях сайта, проверка e-mail, лимиты длины строк).
- `app.set('trust proxy', 1)`, `express.json({ limit: '1mb' })`, заголовки `X-Content-Type-Options: nosniff` и `Referrer-Policy: strict-origin-when-cross-origin`.
- Rate-limit (`express-rate-limit`: 15 попыток за 15 минут) на `/api/auth/login` и `/api/auth/setup`.
- **Публичные эндпоинты:**
  - `GET /api/health` → `{ ok: true, database: 'sqlite', storage }`
  - `GET /api/cards/:id` → активная карточка + `settings` (`404`, если архивирована или не существует)
  - `GET /api/settings/public`
  - `GET /api/auth/status`, `POST /api/auth/setup`, `POST /api/auth/login`
- **Защищённые эндпоинты (`requireAdmin`):**
  - `POST /api/auth/logout`
  - `GET /api/employees` (возвращает все записи включая архивные + `settings`)
  - `POST /api/employees`, `PUT /api/employees/:id`, `PATCH /api/employees/:id/archive`, `DELETE /api/employees/:id`, `POST /api/employees/reorder`
  - `POST /api/employees/import-csv` (в одной SQL-транзакции, режим добавления/обновления или полной замены)
  - `GET /api/employees/export-csv` (UTF-8 BOM для Excel + нейтрализация формул `=`, `@`, `\t`, `\r`)
  - `PUT /api/settings`
- **Раздача фронтенда:** в dev (`NODE_ENV !== 'production'`) монтируется `vite.middlewares` на порту `3000`; в prod (`NODE_ENV === 'production'`) раздаётся `dist/` со SPA-фоллбэком на `index.html`.

---

## 3. Клиентская часть: API, вход, каталог и админка БД

1. **`src/services/api.ts`:** единый типизированный клиент `api.*` с хранением `authToken` в замыкании модуля (при `401` токен сбрасывается и возвращается экран входа).
2. **`src/components/PasswordScreen.tsx`:** при монтировании запрашивает `api.getAuthStatus()`. Если `needsSetup: true` — показывает форму первичной установки пароля (пароль + подтверждение), иначе — обычный вход.
3. **`src/components/Header.tsx`:** однострочная 3-зонная шапка: логотип слева, 3 вкладки в центре (**«Визитки»**, **«База данных»**, **«Конструктор PDF»**), кнопка **«Выйти»** справа.
4. **`src/components/DatabaseAdmin.tsx`:**
   - Тулбар: счётчик активных/архивных, кнопки «Реквизиты», «Импорт CSV», «Экспорт CSV», «Добавить сотрудника».
   - Поиск + сегментированный фильтр (`Активные` / `Архив` / `Все`).
   - Таблица с колонками: *Сотрудник и `?card=<id>`*, *Должность и отдел*, *Контакты* (с фоллбэком на общий телефон), *Мессенджеры*, *Действия* (Открыть визитку / Собрать PDF CMYK / Редактировать / Архив-Восстановить / Удалить с inline-подтверждением).
   - Модальное окно создания/редактирования визитки (при редактировании отображается неизменяемый `?card=<id>`).
   - Раскрывающиеся панели «Общие реквизиты компании» и «Импорт CSV».
5. **`src/App.tsx`:**
   - При наличии `?card=<id>` или `?id=<id>` работает публичный режим визитки: запрос `GET /api/cards/:id` без авторизации, отображается только `<CardView />` (без шапки и кнопки «Все визитки компании»).
   - Полностью удалены старый `SheetEditor`, Google Sheets sync и `localStorage`-кэш базы.
   - В каталоге на каждой карточке сотрудника: кнопки **«Открыть»**, **«PDF»** (переход в конструктор с автовыбором этого сотрудника), **«Копировать ссылку»**, **«Скачать VCF»** (Windows-1251).

---

## 4. Модуль генерации печатных визиток PDF CMYK (50×90 / 90×50 мм)

### 4.1. Файлы модуля

```text
src/utils/pdf/
├── cmykPalette.ts       # Фирменные цвета в DeviceCMYK (TIL <= 215%) + HEX для SVG-превью
├── logoGeometry.ts      # Векторные SVG-пути логотипа (full + mark) для UI и PDF
├── qrVector.ts          # Генерация матрицы QR (QRCode.create, level M) + URL / vCard payload
├── fontLoader.ts        # Загрузка /fonts/IBMPlexSans-*.ttf + opentype.js (ширина, перенос, кривые)
├── cardLayouts.ts       # Единая миллиметровая раскладка BuiltCardPage (90×50 и 50×90, 1 и 2 стр.)
├── preflightCheck.ts    # Автопроверка вылетов, переполнения строк, размера QR и фоллбэка телефона
└── generateCardPdf.ts   # Генератор векторного PDF (pdf-lib): DeviceCMYK, PageBoxes, Crop Marks

src/components/pdf-builder/
├── CardPreviewCanvas.tsx # Точный векторный SVG-предпросмотр 1:1 по тем же координатам BuiltCardPage
└── PdfCardBuilder.tsx    # Конструктор: выбор из БД, формат, шаблон, поля, правки, Prepress, скачивание
```

### 4.2. Обязательные полиграфические правила

1. **Истинный `DeviceCMYK` (0 RGB-операторов):**
   - Все цвета создаются исключительно через `cmyk(c, m, y, k)` из `pdf-lib`.
   - Мелкий текст — **только канал K** (`C:0 M:0 Y:0 K:88` и `K:60`), чтобы исключить цветные ореолы при неприводке.
   - QR-код и метки реза — строго **`C:0 M:0 Y:0 K:100`** на белой «тихой зоне» (`C:0 M:0 Y:0 K:0`, `quietZoneMm = 1.4–1.8 мм`).
   - Тёмные плашки/логотип — контролируемый составной CMYK с `TIL ≤ 250%`.
2. **Геометрия и PageBoxes (`MM_TO_PT = 72 / 25.4`):**
   - `TrimBox`: строго `90×50 мм` (`255.12×141.73 pt`) или `50×90 мм` (`141.73×255.12 pt`).
   - `BleedBox`: `TrimBox` + вылеты (`0 / 2 / 3 мм`, по умолчанию `2 мм` → `94×54 мм` / `54×94 мм`); фон и акцентные полосы уходят в вылеты.
   - `MediaBox`: равен `BleedBox`, либо +`5 мм` с каждой стороны при включённых метках реза (`cropMarks: true`).
   - Безопасная зона (`Safe Zone`): `-4 мм` от `TrimBox`.
3. **Векторный логотип, QR и шрифты в кривых:**
   - Логотип рисуется через `page.drawSvgPath(d, { x, y, scale, color })` (с инверсной версией для тёмного оборота).
   - QR-код рисуется нативными `page.drawRectangle` (с микроперекрытием `+0.04 pt` против артефактов сглаживания).
   - **Шрифты в кривых (`convertTextToOutlines: true` по умолчанию):** `font.getPath(text, 0, 0, fontSizePt).toPathData(2)` → `page.drawSvgPath(..., { scale: 1 })` (в PDF **`0` шрифтовых объектов**). При снятии галочки — встраивание подмножества TTF через `@pdf-lib/fontkit`.
   - Важно: `opentype.js` импортировать как `import * as opentype from 'opentype.js';` (именованный ESM-экспорт).

### 4.3. Утверждённые правила вёрстки макетов

- **Горизонтальная `90×50 мм` (1 сторона):**
  - Верхняя зелёная акцентная полоса `1.8 мм` (или левая `1.6 мм` в «Минимализме»), уходящая в вылеты.
  - Логотип слева сверху (`y = 5.6 мм`, в минимализме `5.2 мм`).
  - **QR-код (`21×21 мм`, `x = 63.5 мм`) выровнен строго по верхней линии вровень с логотипом (`y = 5.6 мм` / `5.2 мм`).**
  - **Никаких подписей под QR-кодом** (без «Сохранить контакт», без домена под QR).
  - Слева под логотипом: ФИО (автоуменьшение кегля при длинных именах), должность, опционально департамент; контактные строки и адрес прижаты аккуратно к нижней границе безопасной зоны (`45.4 мм`). Если личного телефона нет — подставляется общий телефон офиса.
- **Горизонтальная `90×50 мм` (2 стороны):**
  - Лицевая: просторная типографика контактов без QR.
  - Оборотная (`classic-light` белая или `contrast-back` тёмная плашка в вылеты): **логотип (`x = 7.5 мм, y = 7.5 мм`) и QR-код (`24×24 мм, x = 58.5 мм, y = 7.5 мм`) выровнены по одной верхней линии**; под логотипом — сайт, общий телефон и адрес; под QR подписей нет.
- **Вертикальная `50×90 мм` (1 и 2 стороны):**
  - Центрированная композиция: логотип сверху, контакты по центру, QR-код `21×21 мм` (1 стр.) или `26×26 мм` на обороте (2 стр.) — также без подписей под QR.
- **Конструктор (`PdfCardBuilder.tsx`):**
  - Выбор любой активной визитки из SQLite с поиском;
  - Переключатели: ориентация (`90×50` / `50×90`), стороны (`1` / `2`), шаблон (`Светлый` / `Тёмный оборот` / `Минимализм`), содержимое QR (`Ссылка` / `vCard`), видимость полей (без пункта «Подпись под QR»), локальные правки текста только для тиража, параметры Prepress (`Bleed`, `Outlines`, `Crop Marks`, `Направляющие`);
  - Интерактивный SVG-предпросмотр с переключателем `Обе / Лицо / Оборот` и preflight-панелью.

---

## 5. Автодеплой GitHub Actions и настройка на Beget VPS

### 5.1. `.github/workflows/deploy.yml`

- Триггеры: `push` в `main`/`master` + `workflow_dispatch`.
- На раннере GitHub (Node 22): `npm ci`, `npm run build`, `npm run build:server`.
- Если секреты `BEGET_HOST`, `BEGET_USERNAME`, `BEGET_SSH_KEY` не заданы — выводит `::warning::` и завершается успешно без загрузки.
- Упаковывает `dist`, `dist-server`, `package.json`, `package-lock.json` в `release.tar.gz`, загружает по SSH/SCP в `/var/www/contact.<domain>.ru/`.
- На VPS:
  - Сравнивает `sha256sum package-lock.json` с `.lock_sha256` и запускает `npm ci --omit=dev` **только если зависимости изменились** (или нет `node_modules`).
  - Атомарно подменяет `dist` и `dist-server`.
  - Перезапускает `contact-<slug>-api.service`, если он включён.
  - Файл `/var/lib/contact-<slug>/cards.db` **не затрагивается**.

### 5.2. Однократная настройка нового сервиса на VPS

1. Создать изолированный SSH-ключ `id_ed25519_gh_actions_contact_<slug>` и добавить секреты `BEGET_HOST`, `BEGET_USERNAME`, `BEGET_SSH_KEY` в новый GitHub-репозиторий.
2. Запустить первый деплой в GitHub Actions.
3. На VPS создать:
   - папки `/var/lib/contact-<slug>` и `/var/backups/contact-<slug>` (`chmod 700`);
   - `/etc/contact-<slug>.env` (`chmod 600`) с уникальным `PORT=3011` и `DB_PATH=/var/lib/contact-<slug>/cards.db`;
   - `/etc/systemd/system/contact-<slug>-api.service` (`ExecStart=<node> /var/www/contact.<domain>.ru/dist-server/server.mjs`, `MemoryMax=256M`);
   - `/etc/nginx/conf.d/contact.<domain>.ru.conf` с `root /var/www/contact.<domain>.ru/dist`, `location /api/ { proxy_pass http://127.0.0.1:3011; ... }`, `location /fonts/ { expires 30d; ... }`, `location / { try_files $uri $uri/ /index.html; }`;
   - SSL через `certbot --nginx -d contact.<domain>.ru --redirect`;
   - скрипт ежедневного бэкапа `/etc/cron.daily/backup-contact-<slug>-db` через `sqlite3 ... ".backup ..."`.

---

## 6. Чеклист проверки после переноса

1. **Сборка и типы:** `npm run build`, `npm run build:server` и `npm run lint` (`tsc --noEmit`) проходят без ошибок.
2. **API и безопасность:**
   - `GET /api/health` → `200 OK` (`database: "sqlite"`).
   - `GET /api/cards/<slug>` → `200 OK` без авторизации (отдаёт визитку из SQLite).
   - `GET /api/employees` без Bearer-токена → `401 Unauthorized`.
   - Первичная настройка пароля (или `ADMIN_PASSWORD` из env) позволяет войти и редактировать БД.
3. **Полиграфический PDF CMYK:**
   - В распакованных потоках сгенерированного PDF присутствуют только CMYK-операторы (`k`/`K`) и строго **`0` RGB-операторов** (`rg`/`RG`).
   - Присутствуют `/TrimBox` (`90×50` / `50×90 мм`) и `/BleedBox` (`+2 мм`).
   - В режиме кривых (`Outlines`) в PDF `0` объектов `/Type /Font`.
   - QR-код выровнен по верхней линии, без подписей снизу, и сканируется камерой смартфона.
