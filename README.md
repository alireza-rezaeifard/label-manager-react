# Label Studio

A modern document management and label printing application with PWA support, offline-local mode, and Express + SQLite backend with real-time sync.

## Features

- **Record Management** — Add, edit, delete, sort, filter, search, drag-and-drop reorder, inline edit
- **Local & Server Mode** — Fully offline via localStorage, or connected to Express+SQLite with JWT auth
- **Multi-Workspace** — Create separate workspaces with member roles: owner / admin / editor / viewer
- **Real-Time Sync** — WebSocket (Socket.IO) broadcasts record changes across clients per workspace
- **Role-Based Access Control** — Viewers are read-only; editors can create/update; admins can restore; owners can transfer/delete workspaces
- **CSV Import/Export** — Bulk import from CSV, download Excel / CSV / PDF
- **Export All** — One-click export of all records (not just selected) to Excel, CSV, or print
- **Label Printing** — Print-ready labels with cut marks, 3 templates (classic / compact / detailed), QR codes, barcodes
- **Print Queue** — Queue multiple print jobs with status tracking
- **Reports & Charts** — Recharts pie/bar charts by type, project, party, monthly, amount
- **Image Upload** — Attach images to records (server storage in server mode, base64 in local mode)
- **Color Picker** — Custom label color with visual color bar on cards
- **Bulk Edit** — Batch update field values, tags, and colors on multiple records
- **Persian Datepicker** — Jalali (Shamsi) calendar integration via @daypicker/persian
- **Undo** — Ctrl+Z with 20-entry undo stack (local mode)
- **4 Themes** — Light (روشن), Dark (تیره), Sepia (قهوه‌ای), High-Contrast (کنتراست بالا)
- **Dynamic Custom Fields** — Add extra fields per record with types: text, number, date, dropdown, color
- **Tag Management** — Create and assign tags, filter records by tag
- **Record Templates** — Save/load recurring record patterns
- **Filter Presets** — Save/load search/filter combinations
- **Table & Card Views** — Switch between grid cards or sortable table with virtual scrolling for large datasets
- **Activity Log** — Recent workspace actions shown in sidebar (create, update, delete, restore, etc.)
- **Password Change** — Update password from Profile tab (server mode)
- **QR Scanner** — Scan QR codes to quickly find and view records
- **Backup & Restore** — Download full JSON backup, restore from file (local + server)
- **Keyboard Shortcuts** — Ctrl+N (new), Ctrl+E (edit), Ctrl+D (duplicate), Ctrl+S (save), Ctrl+Z (undo), Delete, Ctrl+F (search), and more
- **PWA** — Service worker with cache-first strategy, installable, offline support
- **Rate Limiting** — Auth endpoints limited to 10 req/15min, global API 100 req/15min
- **Security** — Helmet headers, CORS whitelist, JWT expiry (7d), password complexity validation, auth-protected uploads

## Quick Start

```bash
# Frontend
npm install
npm run dev        # http://localhost:5173

# Backend (separate terminal)
cd server
npm install
npm start          # http://localhost:3001
```

Set a `JWT_SECRET` environment variable before starting the server (copy `server/.env.example` to `server/.env`).

The Vite dev server proxies `/api` requests to the backend at `localhost:3001`.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_SOCKET_URL` | `http://localhost:3001` | WebSocket server URL (frontend) |
| `JWT_SECRET` | _(required)_ | Secret key for JWT signing (server) |
| `DB_PATH` | `data.db` | SQLite database file path (server) |
| `PORT` | `3001` | Express server port (server) |

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run frontend Vitest tests |
| `npm run test:watch` | Watch mode for frontend tests |
| `cd server && npm start` | Start Express backend |
| `cd server && npm run test` | Run server integration tests |

## Project Structure

```
label-studio/
├── index.html
├── package.json
├── vite.config.js            # Vite config + proxy + Vitest
├── tsconfig.json             # TypeScript strict mode (noImplicitAny: false)
├── public/
│   ├── sw.js                 # Service worker (cache-first)
│   └── manifest.json         # PWA manifest
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Main app: routing, auth, state, handlers
│   ├── types.ts              # TypeScript interfaces
│   ├── context/
│   │   └── AppContext.tsx     # React context for app state
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx       # Nav + activity log feed
│   │   ├── RecordCard.tsx
│   │   ├── RecordForm.tsx
│   │   ├── TableView.tsx
│   │   ├── StatsCards.tsx
│   │   ├── ReportsTab.tsx
│   │   ├── LabelPreview.tsx
│   │   ├── ViewDetail.tsx
│   │   ├── ImportCSV.tsx
│   │   ├── LoginPage.tsx
│   │   ├── ProfileTab.tsx
│   │   ├── HistoryTab.tsx
│   │   ├── SettingsTab.tsx
│   │   ├── FilterPresets.tsx
│   │   ├── DateRangePicker.tsx
│   │   ├── PrintQueue.tsx
│   │   ├── PrintSettingsModal.tsx
│   │   ├── BackupModal.tsx
│   │   ├── WorkspaceSwitcher.tsx
│   │   ├── MultiSelectDropdown.tsx
│   │   ├── QRScanner.tsx
│   │   ├── ShortcutsHelp.tsx
│   │   ├── VirtualizedRecordGrid.tsx
│   │   ├── LoadingScreen.tsx
│   │   ├── LoadingSkeleton.tsx
│   │   ├── Toast.tsx
│   │   └── ErrorBoundary.tsx
│   ├── hooks/
│   │   ├── useRecords.ts          # Local records CRUD + undo
│   │   ├── useToast.ts            # Toast notifications
│   │   ├── useKeyboardShortcuts.ts
│   │   └── useWebSocket.ts        # Socket.IO client (JWT auth)
│   ├── utils/
│   │   ├── api.ts                 # API client with JWT + all endpoints
│   │   ├── exporters.ts           # Print, Excel, CSV, PDF export
│   │   ├── excelImport.ts         # Excel file parsing
│   │   └── formatters.ts          # Persian date/currency formatters
│   ├── data/
│   │   └── fields.ts              # Label field definitions + constants
│   ├── styles/
│   │   └── main.css               # All styles including 4 themes
│   └── __tests__/                 # 60 Vitest tests
│       ├── useRecords.test.ts
│       ├── useToast.test.ts
│       ├── useKeyboardShortcuts.test.ts
│       ├── RecordCard.test.tsx
│       ├── exporters.test.ts
│       ├── formatters.test.ts
│       ├── formatters.extended.test.ts
│       └── fields.test.ts
├── server/
│   ├── index.js               # Express entry: helmet, CORS, rate limit, WS, error middleware
│   ├── db.js                  # SQLite schema (WAL mode) + column sync + seed admin
│   ├── ws.js                  # Socket.IO server (JWT-authenticated)
│   ├── migrate.js             # Migration runner
│   ├── errors.js              # AppError class + error handler
│   ├── middleware/
│   │   └── auth.js            # JWT gen/verify, auth middleware, workspace role middleware
│   ├── routes/
│   │   ├── auth.js            # Register, Login, Me, ChangePassword (with complexity validation)
│   │   ├── records.js         # CRUD, batch delete, reorder, backup/restore, check-code, activity
│   │   └── workspaces.js      # CRUD, invite, members, role management, transfer, delete
│   ├── migrations/
│   ├── __tests__/             # 15 server integration tests
│   │   ├── setup.js
│   │   └── records.test.js    # Health, auth, CRUD, rate limiting, duplicate code
│   └── package.json
└── Dockerfile + docker-compose.yml
```

## API

See [API.md](API.md) for full API documentation.

## Technologies

- **React 19** + **Vite 8** + **TypeScript** (frontend)
- **Express 4** + **better-sqlite3** (WAL mode) + **JWT** (backend)
- **Socket.IO** — real-time WebSocket sync with per-workspace rooms
- **Recharts** — pie/bar charts for reports
- **PapaParse** — CSV import/export
- **SheetJS/xlsx** — Excel export
- **jspdf** + **html2canvas** — PDF export
- **Tabler Icons** — UI icons (CDN)
- **Vazirmatn Font** — Persian font
- **@daypicker/persian** + **@daypicker/react** — Jalali datepicker
- **react-window** — Virtualized scrolling for large datasets
- **qrcodejs** — QR code on labels (CDN)
- **jsqr** — QR code scanning from webcam
- **bcryptjs** + **jsonwebtoken** — Auth
- **helmet** + **cors** + **express-rate-limit** — Security
- **sharp** — Image processing (server-side resize)
- **Vitest** + **@testing-library/react** — 75 tests (60 FE + 15 server)
