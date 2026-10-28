# CampusBid

A campus auction marketplace for listing, discovering, and bidding on student items.

## Features

- Live auction countdowns and public bid history
- Search, category filters, and price/time sorting
- Minimum increment validation and 30-second last-call extensions
- Automatic bidding and watchlists
- Persistent in-app alerts plus browser pop-ups for outbid, bids, auction closure, sale outcomes, and watchlist endings
- Listing creation with a required user-selected product photo, category, condition, description, and auction duration
- Seller editing of active auction details and cancellation with confirmed outcomes
- AI assistant keyword and maximum-price search
- Responsive desktop and mobile interface
- Automatic closure with provisional winners or unsold outcomes
- Seller approval/rejection, reservation, handover confirmation, cancellation, and failed-pickup tracking
- Shared SQLite persistence and real-time multi-user updates

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

## Auction closing and sale outcomes

The backend checks listings whenever listings are loaded or bids are placed. When closing time passes, the highest bid becomes `provisional_winner`; an auction with no bids becomes `unsold`.

- Seller actions use `POST /api/listings/:id/outcome` with `{ "action": "approve" | "reject" | "cancel" | "handover" | "pickup_failed" }`.
- Approval changes the listing to `reserved`; `handover` changes it to `sold` only after campus pickup is confirmed.
- Rejection, seller cancellation, and failed pickup are saved as clear `outcome` values and times on the listing and delivered to the winner when applicable.
- Sellers can review and manage outcomes in the **My auctions** dashboard.
