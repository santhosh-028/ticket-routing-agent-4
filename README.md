# VANDHU — Ticket Routing Agent

Rule-based support ticket routing dashboard. A customer/agent submits a ticket
(subject + description), and the engine automatically classifies it into the
right team, assigns a priority, and shows a live "routing rail" of open
tickets per team.

## What's inside

```
ticket-routing-agent/
├── server.js          Express backend + routing engine + REST API
├── package.json
├── public/
│   ├── index.html      Dashboard UI
│   ├── style.css       Control-room styled theme
│   └── app.js          Frontend logic (fetch calls + rendering)
└── README.md
```

## Run it

Requires Node.js 18+ (works fine on 20/22 too).

```bash
cd ticket-routing-agent
npm install
npm start
```

Then open **http://localhost:3000** in your browser. You'll land on the sign-in
page first.

The server serves both the API and the frontend on the same port, so there's
nothing else to configure.

## Login

A demo account is seeded automatically:

- **Username:** `admin`
- **Password:** `admin123`

Or click **Create account** on the sign-in page to register your own
username/password — new accounts work immediately, no email verification.

Sessions last 8 hours (cookie-based, via `express-session`). Click **Log out**
in the top-right of the dashboard to end your session — the API refuses all
ticket requests once logged out, so it's a real guard, not just a UI hide.

## How routing works

`server.js` has a `classifyTicket()` function that scores the ticket's text
against keyword sets for each team:

- Billing & Payments
- Technical Support
- Account & Access
- Engineering (Bugs)
- Sales & Pricing
- Security & Abuse
- General Support (fallback, when nothing else matches confidently)

It also flags **priority** (High / Medium / Low) based on urgency keywords
("urgent", "asap", "production down", etc.) and message length.

This is intentionally simple and dependency-free so it runs anywhere. To
upgrade it to an LLM-based classifier later, replace the body of
`classifyTicket()` in `server.js` with a call to the Claude API (or any other
model) and keep returning the same `{ team, priority, confidence }` shape —
the rest of the app doesn't need to change.

## API reference

| Method | Route                | Description                          |
|--------|----------------------|---------------------------------------|
| POST   | `/api/auth/signup`   | Create an account, auto-signs in     |
| POST   | `/api/auth/login`    | Sign in with username + password     |
| POST   | `/api/auth/logout`   | End the session                      |
| GET    | `/api/auth/me`       | Current signed-in user (401 if none) |
| GET    | `/api/teams`         | List teams with open ticket counts   |
| GET    | `/api/tickets`       | List tickets (`?team=`, `?status=`)  |
| POST   | `/api/tickets`       | Create + auto-route a ticket         |
| PATCH  | `/api/tickets/:id`   | Update status or reassign team       |
| DELETE | `/api/tickets/:id`   | Delete a ticket                      |
| GET    | `/api/stats`         | Totals: open/resolved/high priority  |

## Notes

- Data is stored in memory, so it resets when the server restarts. Swap in a
  real database (Postgres, SQLite, MongoDB) by replacing the `tickets` array
  in `server.js` if you need persistence.
- All buttons (Route ticket, Resolve/Reopen, Delete, filters) are wired to
  the backend and update the queue live — nothing is a placeholder.
