# Bueno Logistics — Rail Operations Platform

A trip-planning, cargo-inventory, and live-tracking platform for Bueno's rail freight
operations — built around the actual workflow (trip → wagon/loco allocation → cargo
loading → transit → unloading → close), not a generic logistics template.

This is a **working demo build**: real backend, real database, real UI — running
entirely on your machine with **zero external services** (no Docker, no Postgres,
no cloud accounts required).

---

## What's in here

```
apps/
  api/      NestJS backend — trips, fleet, cargo inventory, tracking, auth
  web/      Next.js dashboard — Admin / Head of Operations / Cargo Officer views
  mobile/   Expo/React Native customer app
infrastructure/   Docker & k8s configs (optional — not needed to run the demo)
```

## Quick start (demo — web + API only, ~5 minutes)

**Prerequisites:** Node.js 20+ and npm. That's it — no database server, no Docker.

```bash
# 1. Install everything (this is an npm workspace — one install covers api + web + mobile,
#    and automatically generates the Prisma Client — no extra step needed)
npm install

# 2. Set up the database (SQLite, local file, zero config)
cd apps/api
cp .env.example .env
node prisma/init-db.js        # creates the schema
npx ts-node prisma/seed.ts    # seeds demo data (see accounts below)
cd ../..

# 3. Run the backend (terminal 1)
cd apps/api
npm run dev
# → http://localhost:3001   (Swagger docs at /api/docs)

# 4. Run the web dashboard (terminal 2)
cd apps/web
cp .env.example .env.local
npm install                    # installs the swc binary Next.js needs
npm run dev
# → http://localhost:3000
```

Open **http://localhost:3000/auth/login** — you'll see one-click demo logins for
every role. No typing credentials needed.

### Demo accounts (password for all: `demo1234`)

| Role | Email | What it shows |
|---|---|---|
| Admin | `admin@bueno.ng` | Fleet oversight, users, reporting |
| Head of Operations | `ops@bueno.ng` | Network-wide trip visibility |
| Cargo Officer (origin) | `cargo.ewekoro@bueno.ng` | Loading workflow — Ewekoro terminal |
| Cargo Officer (destination) | `cargo.moniya@bueno.ng` | Unloading workflow — Moniya terminal |
| Customer | `customer@bueno.ng` | Booking & tracking view |

### What to click through in a demo

The seed data is deliberately staged across **every stage of the trip lifecycle** so
there's something live to show at each step:

- **`trip-004`** — loading in progress. Two wagons already have cargo logged; the
  third is empty — click **"Log item"** to show the live loading flow.
- **`trip-006`** — arrived at destination, awaiting unload confirmation — shows the
  "Confirm unload" flow.
- **`trip-007`** — completed trip with a **real discrepancy**: one wagon shows 1200
  bags loaded vs. 1185 unloaded, flagged as damaged with a note. This is the
  flagship "one record, used twice" proof point from the proposal.
- **Fleet page** — 3 wagons and 1 locomotive are seeded as `MAINTENANCE`. Try
  allocating wagons to a trip — maintenance units don't appear as selectable.

---

## Mobile app (optional, Expo)

```bash
cd apps/mobile
npm install
npx expo start
```

Scan the QR code with Expo Go, or run on a simulator. Points at the same backend
(`http://localhost:3001`) — update `MOBILE_URL`/API base in `apps/mobile/.env` if
running on a physical device on the same network (use your machine's LAN IP, not
`localhost`).

---

## Resetting the demo data

Any time you want a clean slate (e.g. right before presenting):

```bash
cd apps/api
node prisma/init-db.js
npx ts-node prisma/seed.ts
```

This drops and recreates every table, then reseeds the same realistic demo dataset.

---

## Notes on the technical setup

**Why SQLite instead of Postgres?** So this runs on any machine with zero setup —
no Docker, no database server to install, no connection strings to configure. The
schema is written the same way it would be for Postgres; switching back for
production is a one-line change in `apps/api/prisma/schema.prisma` plus updating
`DATABASE_URL`.

**Database setup script (`apps/api/prisma/init-db.js`):** Table creation is handled
by a small local script instead of `prisma migrate`/`prisma db push`. Both of those
commands normally download a native "schema-engine" binary from Prisma's CDN —
in locked-down network environments (corporate proxies, CI runners, sandboxes) that
download can fail with a 403. The app itself doesn't need that binary at all — it
runs on Prisma's WASM query engine via `@prisma/adapter-better-sqlite3`, which is a
fully-supported, production-grade setup. `init-db.js` just creates the tables
directly so you're not blocked by that CDN dependency. If your environment can
reach `binaries.prisma.sh`, you can use `npx prisma migrate dev` as normal instead.

**Roles:** `ADMIN`, `HEAD_OF_OPERATIONS`, `CARGO_OFFICER`, `CUSTOMER`, `DRIVER` —
matching the four experiences in the proposal (Admin, Head of Operations, Cargo
Officer, Customer; Driver is used internally for locomotive assignment).

---

## What's implemented vs. what's next

**Working now:**
- Full trip lifecycle (7 stages) with status transitions
- Wagon/locomotive allocation — maintenance-flagged units automatically excluded
- Cargo inventory: log items at loading, confirm at unloading, automatic
  discrepancy flagging (short/damaged) — the same record used at both ends
- Role-based dashboard views (Admin, Head of Operations, Cargo Officer)
- Coordination chat per trip
- Fleet, routes, and cargo-type management
- JWT auth with refresh tokens

**Scaffolded, not deeply wired up yet (good next-phase targets):**
- Live GPS tracking map (backend + data model ready; frontend map view is basic)
- Customer-facing mobile app (Expo app builds; hasn't had the same UI pass as web)
- Notifications (email/SMS) — data model exists, delivery not connected
- Paystack payment flow — endpoint scaffolded, needs real API keys to test live
