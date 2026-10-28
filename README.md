# CampusBid

A campus auction marketplace for listing, discovering, and bidding on student items.

## Features

- Live auction countdowns and public bid history
- Search, category filters, and price/time sorting
- Minimum increment validation and 30-second last-call extensions
- Automatic bidding and watchlists
- Listing creation with category, condition, description, and auction duration
- AI assistant keyword and maximum-price search
- Responsive desktop and mobile interface
- Browser-local demo persistence

## Full-stack run

```bash
npm install
npm run dev:full
```

- Frontend: `http://localhost:5173`
- Backend API and SSE: `http://localhost:3001`

For a production build, run:

```bash
npm run build
npm start
```

Then open `http://localhost:3001`. The production server serves both the React app and API.

## Backend and database

- Database: SQLite via `sql.js`, a WebAssembly implementation requiring no native build tools.
- Database file: `campusbid.sqlite` in the project root.
- Tables: `users`, `listings`, `bids`, and `notifications`.
- Authentication: signed JWT tokens stored by the browser.
- Passwords: bcrypt hashes; passwords are never stored as plain text.
- Real-time updates: Server-Sent Events at `/api/events` refresh all connected browsers whenever listings, bids, or profiles change.
- API base: `/api`

Inspect the database with any SQLite-capable tool, VS Code extension, or DBeaver. After users and listings are created, the file appears in the project root.
