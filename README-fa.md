# لیبل استودیو

برنامه مدیریت اسناد و چاپ لیبل مدرن با پشتیبانی PWA، حالت آفلاین/محلی، سرور Express + SQLite با همگام‌سازی بلادرنگ و رابط کاربری کاملاً فارسی.

**[English](README.md)**

## امکانات

### هسته برنامه
- **مدیریت رکوردها** — افزودن، ویرایش، حذف، مرتب‌سازی، فیلتر، جستجو، ترتیب با کشیدن و رها کردن، ویرایش درون‌خطی
- **حالت محلی و سروری** — کاملاً آفلاین با localStorage، یا اتصال به Express + SQLite با احراز هویت JWT
- **فضاهای کاری چندگانه** — ایجاد فضاهای کاری جداگانه با نقش‌های عضو: مالک / مدیر / ویرایشگر / بیننده
- **همگام‌سازی بلادرنگ** — WebSocket (Socket.IO) تغییرات رکوردها را در هر فضای کاری بین کلاینت‌ها پخش می‌کند
- **کنترل دسترسی مبتنی بر نقش** — بینندگان فقط خواندنی هستند؛ ویرایشگران می‌توانند ایجاد/ویرایش کنند؛ مدیران می‌توانند بازیابی کنند؛ مالکان می‌توانند فضا را انتقال دهند/حذف کنند

### درون‌ریزی / برون‌بری
- **درون‌ریزی CSV** — درون‌ریزی انبوه با نگاشت هوشمند ستون‌ها و اعتبارسنجی
- **برون‌بری** — دانلود به صورت Excel (xlsx)، CSV یا PDF
- **برون‌بری همه** — برون‌بری یک‌کلیک تمام رکوردها (نه فقط انتخاب شده‌ها)
- **پشتیبان‌گیری و بازیابی** — دانلود پشتیبان JSON کامل، بازیابی از فایل (محلی + سرور)

### چاپ لیبل
- **لیبل‌های آماده چاپ** — نشانه‌های برش، ۳ قالب (کلاسیک / فشرده / جزئی)
- **کدهای QR و بارکد** — تولید خودکار روی لیبل‌ها
- **صف چاپ** — صف‌بندی چندین کار چاپ با پیگیری وضعیت
- **تاریخچه چاپ** — پیگیری کارهای چاپ اخیر

### گزارش‌ها و تحلیل‌ها
- **نمودارها** — نمودار دایره‌ای/میله‌ای بر اساس نوع، پروژه، طرف حساب، ماهانه و مبلغ
- **کارت‌های آماری** — نمای کلی تعداد و مجموع رکوردها

### رابط کاربری
- **۴ پوسته** — روشن، تیره، قهوه‌ای، کنتراست بالا
- **تقویم فارسی** — تقویم جلالی از طریق `@daypicker/persian`
- **نمای جدول و کارت** — کارت‌های شبکه‌ای یا جدول مرتب‌شدنی با اسکرول مجازی برای مجموعه‌های بزرگ
- **انتخابگر رنگ** — رنگ سفارشی لیبل با نوار رنگ بصری روی کارت‌ها
- **بارگذاری تصویر** — پیوست تصویر به رکوردها
- **ویرایش گروهی** — به‌روزرسانی دسته‌ای مقادیر فیلدها، برچسب‌ها و رنگ‌ها
- **واگردانی** — Ctrl+Z با انبار ۲۰ ورودی (حالت محلی)
- **میانبرهای صفحه‌کلید** — Ctrl+N، Ctrl+E، Ctrl+D، Ctrl+S، Ctrl+Z، Delete، Ctrl+F و بیشتر
- **اسکنر QR** — اسکن کدهای QR برای یافتن سریع رکوردها
- **گزارش فعالیت** — اقدامات اخیر فضای کاری در نوار کناری

### فیلدهای پویا و برچسب‌ها
- **فیلدهای سفارشی** — افزودن فیلدهای اضافی به هر رکورد: متن، عدد، تاریخ، لیست انتخابی، رنگ
- **مدیریت برچسب‌ها** — ایجاد و اختصاص برچسب‌ها، فیلتر رکوردها بر اساس برچسب
- **الگوهای رکورد** — ذخیره/بارگذاری الگوهای رکورد تکراری
- **پیش‌ تنظیم فیلترها** — ذخیره/بارگذاری ترکیب‌های جستجو/فیلتر

### PWA و امنیت
- **PWA** — سرویس‌ورکر با استراتیژی کش اول، قابل نصب، پشتیبانی آفلاین
- **محدودیت نرخ** — پایانه‌های احراز هویت: ۱۰ درخواست/۱۵ دقیقه، API عمومی: ۱۰۰ درخواست/۱۵ دقیقه
- **امنیت** — هدرهای Helmet، لیست سفید CORS، انقضای JWT (۷ روز)، اعتبارسنجی پیچیدگی رمز عبور
- **تغییر رمز عبور** — به‌روزرسانی رمز عبور از زبانه پروفایل (حالت سرور)

## شروع سریع

### پیش‌نیازها
- [Node.js](https://nodejs.org/) نسخه ۱۸ یا بالاتر
- npm یا yarn

### توسعه

```bash
# نصب وابستگی‌ها
npm install
cd server && npm install && cd ..

# راه‌اندازی رابط کاربری (سرور توسعه Vite)
npm run dev          # http://localhost:5173

# راه‌اندازی سرور (ترمینال جداگانه)
cd server
npm start            # http://localhost:3001
```

قبل از راه‌اندازی سرور، متغیر محیطی `JWT_SECRET` را تنظیم کنید (فایل `server/.env.example` را به `server/.env` کپی کنید).

سرور توسعه Vite درخواست‌های `/api` را به سرور پس‌زمینه در `localhost:3001` پروکسی می‌کند.

### داکر

```bash
# تنظیم کلید JWT
export JWT_SECRET=your-secret-key

# راه‌اندازی رابط کاربری و سرور
docker-compose up --build
```

- رابط کاربری: http://localhost:3000
- سرور: http://localhost:3001

## متغیرهای محیطی

| متغیر | پیش‌فرض | توضیحات |
|---|---|---|
| `VITE_SOCKET_URL` | `http://localhost:3001` | آدرس سرور WebSocket (رابط کاربری) |
| `JWT_SECRET` | _(الزامی)_ | کلید مخفی برای امضای JWT (سرور). تولید با: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DB_PATH` | `data.db` | مسیر فایل پایگاه داده SQLite (سرور) |
| `PORT` | `3001` | پورت سرور Express (سرور) |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:4173` | مبدأهای CORS جدا شده با کاما (سرور). در تولید دامنه خود را تنظیم کنید. |
| `ADMIN_USERNAME` | `admin` | نام کاربری مدیر پیش‌فرض که در اجرا اول ایجاد می‌شود (سرور) |
| `ADMIN_PASSWORD` | `admin123` | رمز عبور مدیر پیش‌فرض که در اجرا اول ایجاد می‌شود (سرور). **فوراً در تولید تغییر دهید.** |

## دستورات

| دستور | توضیحات |
|---------|-------------|
| `npm run dev` | راه‌اندازی سرور توسعه Vite |
| `npm run build` | بیلد تولیدی |
| `npm run preview` | پیش‌نمایش بیلد تولیدی |
| `npm run lint` | اجرای ESLint |
| `npm run test` | اجرای تست‌های Vitest رابط کاربری |
| `npm run test:watch` | حالت پایش تست‌ها |
| `cd server && npm start` | راه‌اندازی سرور Express |
| `cd server && npm run test` | اجرای تست‌های یکپارچه سرور |

## ساختار پروژه

```
label-studio/
├── index.html
├── package.json
├── vite.config.js              # تنظیمات Vite + پروکسی + Vitest
├── tsconfig.json               # تنظیمات TypeScript
├── docker-compose.yml          # ارکستریشن داکر
├── Dockerfile                  # تصویر سرور
├── Dockerfile.frontend         # تصویر رابط کاربری (Nginx)
├── public/
│   ├── sw.js                   # سرویس‌ورکر (کش اول)
│   └── manifest.json           # manifests PWA
├── src/
│   ├── main.tsx                # نقطه ورود
│   ├── App.tsx                 # برنامه اصلی: مسیریابی، احراز هویت، وضعیت
│   ├── types.ts                # رابط‌های TypeScript
│   ├── context/
│   │   └── AppContext.tsx       # کانتکست React برای وضعیت برنامه
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx         # ناوبری + گزارش فعالیت
│   │   ├── RecordCard.tsx
│   │   ├── RecordForm.tsx      # فرم ایجاد/ویرایش با تکمیل خودکار
│   │   ├── TableView.tsx       # جدول مرتب‌شدنی با اسکرول مجازی
│   │   ├── StatsCards.tsx
│   │   ├── ReportsTab.tsx      # نمودارها (ApexCharts)
│   │   ├── LabelPreview.tsx
│   │   ├── ViewDetail.tsx
│   │   ├── ImportCSV.tsx
│   │   ├── LoginPage.tsx
│   │   ├── ProfileTab.tsx
│   │   ├── SettingsTab.tsx
│   │   ├── FilterPresets.tsx
│   │   ├── DateRangePicker.tsx
│   │   ├── PrintQueue.tsx
│   │   ├── PrintSettingsModal.tsx
│   │   ├── BackupModal.tsx
│   │   ├── WorkspaceSwitcher.tsx
│   │   ├── QRScanner.tsx
│   │   ├── ShortcutsHelp.tsx
│   │   ├── VirtualizedRecordGrid.tsx
│   │   ├── LoadingScreen.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── ui/                 # کامپوننت‌های shadcn/ui
│   ├── hooks/
│   │   ├── useRecords.ts       # عملیات CRUD رکوردها + واگردانی
│   │   ├── useToast.ts         # اعلان‌ها
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useWebSocket.ts     # کلاینت Socket.IO (احراز هویت JWT)
│   │   ├── useWorkspace.ts     # منطق تغییر فضای کاری
│   │   ├── useCustomFields.ts  # مدیریت فیلدهای سفارشی
│   │   ├── usePrintExport.ts   # منطق چاپ و برون‌بری
│   │   └── useRecordForm.ts    # وضعیت و اعتبارسنجی فرم
│   ├── utils/
│   │   ├── api.ts              # کلاینت API با JWT
│   │   ├── exporters.ts        # برون‌بری چاپ، Excel، CSV، PDF
│   │   └── formatters.ts       # قالب‌بندی تاریخ/ارز فارسی
│   ├── data/
│   │   └── fields.ts           # تعریف فیلدهای لیبل
│   ├── styles/
│   │   └── main.css            # تمام استایل‌ها شامل ۴ پوسته
│   └── __tests__/              # تست‌های Vitest
├── server/
│   ├── index.js                # Express: helmet، CORS، محدودیت نرخ، WS
│   ├── db.js                   # طرح SQLite (WAL + FTS5)
│   ├── ws.js                   # سرور Socket.IO (احراز هویت JWT)
│   ├── migrate.js              # اجرای مایگریشن
│   ├── errors.js               # کلاس AppError + مدیریت خطا
│   ├── middleware/
│   │   └── auth.js             # میان‌افزار JWT + نقش فضای کاری
│   ├── routes/
│   │   ├── auth.js             # ثبت‌نام، ورود، پروفایل، تغییر رمز
│   │   ├── records.js          # CRUD، حذف گروهی، ترتیب، پشتیبان/بازیابی، جستجوی FTS
│   │   └── workspaces.js       # CRUD، دعوت، اعضا، مدیریت نقش‌ها، انتقال، حذف
│   ├── migrations/
│   └── __tests__/              # تست‌های یکپارچه سرور
└── docs/                       # مستندات تکمیلی
```

## API

برای مستندات کامل REST API به [API.md](API.md) مراجعه کنید.

## فناوری‌ها

| لایه | فناوری |
|-------|--------|
| **رابط کاربری** | React 19، Vite 8، TypeScript |
| **رابط UI** | Tailwind CSS 4، shadcn/ui (Radix UI)، آیکون‌های Lucide |
| **سرور** | Express 4، better-sqlite3 (WAL + FTS5)، JWT |
| **بلادرنگ** | Socket.IO (WebSocket) با اتاق‌های فضای کاری |
| **نمودارها** | ApexCharts |
| **برون‌بری** | PapaParse (CSV)، SheetJS/xlsx (Excel)، jspdf + html2canvas (PDF) |
| **تاریخ** | @daypicker/persian (تقویم جلالی) |
| **اسکرول مجازی** | react-window |
| **QR** | qrcode (تولید)، jsqr (اسکن) |
| **احراز هویت** | bcryptjs + jsonwebtoken |
| **امنیت** | helmet، cors، express-rate-limit |
| **تست** | Vitest، @testing-library/react، jsdom |
| **PWA** | سرویس‌ورکر با استراتژی کش اول |

## مجوز

برای جزئیات به [LICENSE](LICENSE) مراجعه کنید.
