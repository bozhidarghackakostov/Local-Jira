# LocalJira — A Lightweight, Self-Hosted Jira Alternative

LocalJira is a fast, local-first web application designed for personal ticket and task management. It provides the essential, focused capabilities of Jira without subscriptions, cloud sync, telemetry, microservices, or complex infrastructure.

All data is stored directly on your computer inside a local SQLite database (`./data/localjira.db`). The app runs completely offline once dependencies are installed.

---

## Key Features

- **Monotonic Sequential Ticket Keys**: Automatically generates unique identifiers like `LOC-1`, `LOC-2`, `LOC-3` using atomic SQLite transactions.
- **Full Ticket Lifecycle**:
  - Create tickets with title, description, and status.
  - View full details including timestamps and activity log.
  - Edit title and description inline.
  - Comprehensive status lifecycle: **New**, **Updated - In Progress**, **Updated - Waiting Customer**, **Updated - Closed** (with backwards compatibility for Open and Resolved).
  - Quick status dropdown from both the ticket table, mobile card list, and detail modal.
  - Add chronological comments to any ticket.
  - Delete tickets with confirmation dialog (cascades deletion to all comments via SQLite `ON DELETE CASCADE`).
- **Real-Time Search & Combined Filtering**:
  - Live case-insensitive search across Ticket Key (`LOC-1`), Title, and Description.
  - Instant status filters: **All**, **New**, **In Progress**, **Waiting Customer**, and **Closed**.
  - Multi-column sorting: Created Date, Last Updated, Title (A-Z), and Status (with Ascending/Descending toggles).
  - Search, filters, and sorting work seamlessly together with stable tie-breaking.
- **Data Integrity & Storage**:
  - Native SQLite database with WAL mode and foreign key enforcement.
  - One-click JSON backup export and restore directly from the UI.
  - Local database storage statistics in the Settings panel.
- **Privacy & Local Operation**:
  - Bound to `0.0.0.0` / `localhost`.
  - Zero external database connections or cloud services.
  - Zero telemetry or tracking.
  - Zero external fonts or CDN assets — completely self-contained.
  - Optional dark mode with persistent user preference.

---

## Prerequisites

- **Node.js**: Version 22.0.0 or higher (uses native `node:sqlite`).
- **npm**: Version 10 or higher.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3000`. The SQLite database will be initialized automatically inside `./data/localjira.db`. Starter sample tickets are seeded automatically on first run.

### 3. Build & Run for Production
```bash
npm run build
npm start
```

---

## Running Automated Tests

LocalJira includes a full suite of automated unit and integration tests covering monotonic sequence generation, ticket creation, edits, comments, cascade deletion, search, filtering, and backup/restore:

```bash
npm test
```

Or run directly with Node:
```bash
npx tsx --test tests/**/*.test.ts
```

---

## Where Local Data is Stored

- **Database File**: `./data/localjira.db`
- **WAL Journal**: `./data/localjira.db-wal` (when active)
- The `./data` directory is created automatically on application launch.
- To configure a custom database path, set the environment variable:
  ```bash
  LOCALJIRA_DB_PATH="/path/to/your/custom.db" npm run dev
  ```

---

## Backup and Restore

### Option A: From the UI (Recommended)
1. Click the **Settings** gear icon in the top header or sidebar.
2. Under **Backup & Data Portability**:
   - Click **Export Backup (JSON)** to download a full timestamped JSON snapshot.
   - Click **Restore from JSON** and select a previously exported `.json` file. All tickets and comments will be restored in an atomic transaction.

### Option B: Direct SQLite File Backup
Since LocalJira uses SQLite, you can back up your database at any time by copying the file:
```bash
# Backup
cp data/localjira.db data/localjira.db.backup-$(date +%F)

# Restore
cp data/localjira.db.backup-2026-10-15 data/localjira.db
```

---

## REST API Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tickets` | List tickets with optional `status`, `search`, `sort_by`, `sort_order` |
| `POST` | `/api/tickets` | Create a new ticket (`title`, optional `description`, `status`) |
| `GET` | `/api/tickets/:id` | Get ticket details and comments by ID or key (e.g. `LOC-1`) |
| `PATCH` | `/api/tickets/:id` | Update ticket title, description, or status |
| `DELETE` | `/api/tickets/:id` | Delete ticket and cascade delete comments |
| `POST` | `/api/tickets/:id/comments` | Add a comment to a ticket |
| `GET` | `/api/system/stats` | Retrieve database path, size, and ticket counts |
| `GET` | `/api/system/backup` | Download full JSON export of all tickets and comments |
| `POST` | `/api/system/restore` | Restore tickets and comments from JSON backup payload |
| `POST` | `/api/system/seed` | Seed starter tickets if database is empty |

---

## Troubleshooting

- **Port 3000 already in use**:
  Set a custom port before starting:
  ```bash
  PORT=3001 npm run dev
  ```
- **Permission errors on SQLite database**:
  Ensure the `./data` directory has read and write permissions for the user running the process.
- **Node version warning**:
  Ensure `node -v` prints `v22.x.x` or higher to support native `node:sqlite`.
