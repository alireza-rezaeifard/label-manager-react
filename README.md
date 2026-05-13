# Label Studio

A modern document management and label printing application with PWA support and Express + SQLite backend.

## Features

- **Record Management** — Add, edit, delete, sort, filter, search, drag-and-drop reorder
- **Backend Sync** — Express server with SQLite database, JWT authentication per user
- **Local Mode** — Fully offline-capable via localStorage, no server required
- **CSV Import/Export** — Bulk import from CSV, download Excel/PDF
- **Label Printing** — Print-ready labels with cut marks, 3 templates (classic/compact/detailed), QR codes
- **Reports & Charts** — Recharts pie/bar charts by type, project, party, monthly, amount
- **Image Upload** — Attach images to records (stored on server in server mode, base64 in local mode)
- **Color Picker** — Custom label color with visual color bar on cards
- **Datepicker** — Persian (Jalali) calendar integration
- **Undo/Redo** — Ctrl+Z with 20-entry stack persisted to localStorage
- **Dark/Light Theme** — CSS variable theming persisted across sessions
- **Custom Fields** — Add arbitrary extra fields per record
- **PWA** — Service worker with cache-first strategy, installable, offline support
- **Profile & Settings** — Server status indicator, backup/restore, account info
- **Notifications** — Bell icon in header (placeholder)

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

The Vite dev server proxies `/api` requests to the backend at `localhost:3001`.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest tests |

## Project Structure

```
label-studio/
├── index.html
├── package.json
├── vite.config.js          # Vite config + proxy + Vitest
├── public/
│   ├── sw.js               # Service worker (cache-first)
│   ├── manifest.json       # PWA manifest
│   └── icons/              # PWA icons (SVG)
├── src/
│   ├── main.jsx
│   ├── App.jsx             # Main app: routing, auth, state
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── RecordCard.jsx
│   │   ├── RecordForm.jsx
│   │   ├── StatsCards.jsx
│   │   ├── ReportsTab.jsx
│   │   ├── LabelPreview.jsx
│   │   ├── ViewDetail.jsx
│   │   ├── ImportCSV.jsx
│   │   ├── LoginPage.jsx
│   │   ├── ProfileTab.jsx
│   │   ├── MultiSelectDropdown.jsx
│   │   └── Toast.jsx
│   ├── hooks/
│   │   ├── useRecords.js   # Local records state + undo
│   │   └── useToast.js
│   ├── utils/
│   │   ├── api.js          # API client with JWT
│   │   ├── exporters.js    # Print, Excel, PDF
│   │   └── formatters.js   # Persian number formatting
│   ├── data/
│   │   └── fields.js       # Label field definitions
│   ├── styles/
│   │   └── main.css
│   └── __tests__/          # Vitest tests
├── server/
│   ├── index.js            # Express entry point
│   ├── db.js               # SQLite schema + setup
│   ├── middleware/auth.js  # JWT auth middleware
│   └── routes/
│       ├── auth.js         # Login / Register / Me
│       └── records.js      # CRUD + batch + reorder + backup/restore
```

## API

See [API.md](API.md) for full API documentation.

## Technologies

- **React 19** + **Vite** (frontend)
- **Express** + **better-sqlite3** + **JWT** (backend)
- **Recharts** (charts)
- **PapaParse** (CSV)
- **SheetJS/xlsx** (Excel export)
- **jspdf** + **html2canvas** (PDF export)
- **Tabler Icons** (icons via CDN)
- **Vazirmatn Font** (Persian font)
- **qrcodejs** (QR code on labels, CDN)
- **@daypicker/persian** (Jalali datepicker)
- **Vitest** + **@testing-library/react** (tests)
