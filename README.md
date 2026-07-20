# Label Studio

A modern document management and label printing application built with React and Express. Supports PWA with offline mode, real-time sync via WebSocket, multi-workspace with role-based access control, and a fully Persian (Farsi) UI.

**[فارسی](README-fa.md)**

## Features

### Core
- **Record Management** — Add, edit, delete, sort, filter, search, drag-and-drop reorder, inline edit
- **Local & Server Mode** — Fully offline via localStorage, or connected to Express + SQLite with JWT auth
- **Multi-Workspace** — Create separate workspaces with member roles: owner / admin / editor / viewer
- **Real-Time Sync** — WebSocket (Socket.IO) broadcasts record changes across clients per workspace
- **Role-Based Access Control** — Viewers are read-only; editors can create/update; admins can restore; owners can transfer/delete workspaces

### Import / Export
- **CSV Import** — Bulk import with smart column mapping and validation
- **Export** — Download as Excel (xlsx), CSV, or PDF
- **Export All** — One-click export of all records (not just selected)
- **Backup & Restore** — Download full JSON backup, restore from file (local + server)

### Label Printing
- **Print-Ready Labels** — Cut marks, 3 templates (classic / compact / detailed)
- **QR Codes & Barcodes** — Auto-generated on labels
- **Print Queue** — Queue multiple print jobs with status tracking
- **Print History** — Track recent print jobs

### Reports & Analytics
- **Charts** — Pie/bar charts by type, project, party, monthly, and amount
- **Stats Cards** — Overview of record counts and totals

### UI / UX
- **4 Themes** — Light, Dark, Sepia, High-Contrast
- **Persian Datepicker** — Jalali (Shamsi) calendar via `@daypicker/persian`
- **Table & Card Views** — Grid cards or sortable table with virtual scrolling for large datasets
- **Color Picker** — Custom label color with visual color bar on cards
- **Image Upload** — Attach images to records
- **Bulk Edit** — Batch update field values, tags, and colors
- **Undo** — Ctrl+Z with 20-entry undo stack (local mode)
- **Keyboard Shortcuts** — Ctrl+N, Ctrl+E, Ctrl+D, Ctrl+S, Ctrl+Z, Delete, Ctrl+F, and more
- **QR Scanner** — Scan QR codes to quickly find records
- **Activity Log** — Recent workspace actions in sidebar
- **4 Themes** — Light, Dark, Sepia, High-Contrast

### Dynamic Fields & Tags
- **Custom Fields** — Add extra fields per record: text, number, date, dropdown, color
- **Tag Management** — Create and assign tags, filter records by tag
- **Record Templates** — Save/load recurring record patterns
- **Filter Presets** — Save/load search/filter combinations

### PWA & Security
- **PWA** — Service worker with cache-first strategy, installable, offline support
- **Rate Limiting** — Auth endpoints: 10 req/15min, global API: 100 req/15min
- **Security** — Helmet headers, CORS whitelist, JWT expiry (7d), password complexity validation
- **Password Change** — Update password from Profile tab (server mode)

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- npm or yarn

### Development

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Start frontend (Vite dev server)
npm run dev          # http://localhost:5173

# Start backend (separate terminal)
cd server
npm start            # http://localhost:3001
```

Set a `JWT_SECRET` environment variable before starting the server (copy `server/.env.example` to `server/.env`).

The Vite dev server proxies `/api` requests to the backend at `localhost:3001`.

### Docker

```bash
# Set your JWT secret
export JWT_SECRET=your-secret-key

# Start both frontend and backend
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_SOCKET_URL` | `http://localhost:3001` | WebSocket server URL (frontend) |
| `JWT_SECRET` | _(required)_ | Secret key for JWT signing (server). Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DB_PATH` | `data.db` | SQLite database file path (server) |
| `PORT` | `3001` | Express server port (server) |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:4173` | Comma-separated CORS origins (server). Set to your domain in production. |
| `ADMIN_USERNAME` | `admin` | Default admin username created on first run (server) |
| `ADMIN_PASSWORD` | `admin123` | Default admin password created on first run (server). **Change immediately in production.** |

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
├── vite.config.js              # Vite config + proxy + Vitest
├── tsconfig.json               # TypeScript config
├── docker-compose.yml          # Docker orchestration
├── Dockerfile                  # Backend image
├── Dockerfile.frontend         # Frontend image (Nginx)
├── public/
│   ├── sw.js                   # Service worker (cache-first)
│   └── manifest.json           # PWA manifest
├── src/
│   ├── main.tsx                # Entry point
│   ├── App.tsx                 # Main app: routing, auth, state
│   ├── types.ts                # TypeScript interfaces
│   ├── context/
│   │   └── AppContext.tsx       # React context for app state
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx         # Navigation + activity log
│   │   ├── RecordCard.tsx
│   │   ├── RecordForm.tsx      # Create/edit form with autocomplete
│   │   ├── TableView.tsx       # Sortable table with virtual scroll
│   │   ├── StatsCards.tsx
│   │   ├── ReportsTab.tsx      # Charts (ApexCharts)
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
│   │   └── ui/                 # shadcn/ui components
│   ├── hooks/
│   │   ├── useRecords.ts       # Local records CRUD + undo
│   │   ├── useToast.ts         # Toast notifications
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useWebSocket.ts     # Socket.IO client (JWT auth)
│   │   ├── useWorkspace.ts     # Workspace switching logic
│   │   ├── useCustomFields.ts  # Custom field management
│   │   ├── usePrintExport.ts   # Print and export logic
│   │   └── useRecordForm.ts    # Form state and validation
│   ├── utils/
│   │   ├── api.ts              # API client with JWT
│   │   ├── exporters.ts        # Print, Excel, CSV, PDF export
│   │   └── formatters.ts       # Persian date/currency formatters
│   ├── data/
│   │   └── fields.ts           # Label field definitions
│   ├── styles/
│   │   └── main.css            # All styles including 4 themes
│   └── __tests__/              # Vitest tests
├── server/
│   ├── index.js                # Express: helmet, CORS, rate limit, WS
│   ├── db.js                   # SQLite schema (WAL + FTS5)
│   ├── ws.js                   # Socket.IO server (JWT-authenticated)
│   ├── migrate.js              # Migration runner
│   ├── errors.js               # AppError class + error handler
│   ├── middleware/
│   │   └── auth.js             # JWT + workspace role middleware
│   ├── routes/
│   │   ├── auth.js             # Register, Login, Me, ChangePassword
│   │   ├── records.js          # CRUD, batch, reorder, backup/restore, FTS search
│   │   └── workspaces.js       # CRUD, invite, members, roles, transfer
│   ├── migrations/
│   └── __tests__/              # Server integration tests
└── docs/                       # Additional documentation
```

## API

See [API.md](API.md) for full REST API documentation.

## Technologies

| Layer | Stack |
|-------|-------|
| **Frontend** | React 19, Vite 8, TypeScript |
| **UI** | Tailwind CSS 4, shadcn/ui (Radix UI), Lucide icons |
| **Backend** | Express 4, better-sqlite3 (WAL + FTS5), JWT |
| **Real-Time** | Socket.IO (WebSocket) with per-workspace rooms |
| **Charts** | ApexCharts |
| **Export** | PapaParse (CSV), SheetJS/xlsx (Excel), jspdf + html2canvas (PDF) |
| **Date** | @daypicker/persian (Jalali calendar) |
| **Virtual Scroll** | react-window |
| **QR** | qrcode (generation), jsqr (scanning) |
| **Auth** | bcryptjs + jsonwebtoken |
| **Security** | helmet, cors, express-rate-limit |
| **Testing** | Vitest, @testing-library/react, jsdom |
| **PWA** | Service worker with cache-first strategy |

## License

See [LICENSE](LICENSE) for details.
