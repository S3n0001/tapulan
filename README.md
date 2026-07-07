# Tapulan

*Tapulan* (Bisaya for **lazy**) — the app does the remembering so you don't have to.

A mobile-first class schedule **and** requirements tracker for a single Philippine Senior High section. Three strands (STEM · ABM · HUMSS) share one timetable with strand-split blocks; everyone sees the version tuned to their track. It answers **what's now, what's next, what's due** in a glance, and records honest history when a date moves.

## Features

- **Live "now" strip** — current period, time remaining, and what's up next, computed from the device clock (never asserted).
- **Time-proportional week grid** on desktop with a live now-line; a swipeable day view on mobile. Page to any week and see a per-day "N due" count.
- **Month calendar** — a real month grid (Google-Calendar-style, Monday-first): deadline chips colored by type, async/no-class day marks, overdue-but-open in red, "+n more" day popovers, shareable `?m=YYYY-MM` months. On mobile it's a dot grid over a per-day agenda. Today's rail keeps its 7/14/30-day horizon toggle and "due later" peek.
- **Requirements tracker** — unit tests, quizzes, assignments, labs, PETAs, projects, events and reminders, each with its own colour, grouped by due date.
- **Honest moved dates** — reschedule a task and it shows `Jul 10 → Jul 14 · Tentative` with a clarification note, for the classic *"miss, pwede po ba i-move ang PETA?"* case.
- **Strand picker** that persists per device (cookie).
- **Admin editing** behind a shared password — add/edit/move/cancel tasks, edit the whole schedule, subjects and teachers, all live for the section.
- **Light & dark** modes, mobile bottom-nav + desktop tabs, full keyboard/screen-reader support, and `prefers-reduced-motion` alternatives.
- **Backup / restore** — export the whole database to JSON and import it back; reset to the seeded program anytime.
- **Add to your calendar** — subscribe to a read-only iCalendar feed (`/api/ics?strand=STEM`) so deadlines land in Google/Apple Calendar with a day-before reminder.
- **Installable (PWA)** — a web-app manifest + icon, so Android/Chrome offers *Add to Home Screen*.

## Stack

Next.js 15 (App Router) · React 19 · Tailwind v4 (OKLCH tokens) · **better-sqlite3** · Geist Sans/Mono · next-themes.

Nothing in the UI hard-codes schedule or task content — it all lives in SQLite. The only hard-coded values are CSS classes and design tokens.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

On first run a SQLite database is created at `data/tapulan.db` and seeded from the section's printed class program (`src/lib/db/seed.ts`). After that, the data belongs to the app — edit it in **Admin**, not in code.

```bash
npm run build && npm run start   # production
```

## Deploy

Tapulan uses **better-sqlite3** (an embedded database file) and writes uploads to disk, so it needs **a long-running Node process with a persistent, writable filesystem** — a small VPS or a container host with a mounted volume (Fly.io, Railway, Render with a disk). **Serverless/edge hosts (Vercel, Netlify, Cloudflare) won't work**: their filesystems are ephemeral, so the database would silently re-seed to the printed program on every cold start and uploads would vanish.

Point `DATA_DIR` at the mounted volume so the database and uploads survive redeploys, and set a real `ADMIN_PASSWORD`:

```bash
DATA_DIR=/data ADMIN_PASSWORD='choose-something-strong' npm run start
```

A minimal container (mount a volume at `/data`):

```dockerfile
# Dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
ENV DATA_DIR=/data
EXPOSE 3000
CMD ["npm", "run", "start"]
```

```bash
docker build -t tapulan .
docker run -p 3000:3000 -v tapulan-data:/data -e ADMIN_PASSWORD='…' tapulan
```

## Admin

Open **Admin** (gear icon, top-right). The default password is `tapulan` — override it at seed time with the `ADMIN_PASSWORD` env var, or change it later under **Admin → Settings**.

Sessions are an HTTP-only, HMAC-signed cookie (30 days); the password is stored scrypt-hashed. Every mutation is re-checked server-side.

> The client-side gate is a convenience for a trusted class section, not hardened multi-tenant auth. Keep the password among class officers.

## CLI

Post tasks from a terminal without opening the website:

```bash
npm link                 # once — installs the `tapulan` command (or use: npm run cli -- …)
tapulan login            # pairs with http://localhost:3000 (asks for the admin password)
tapulan add "UT 1: Kinematics" -s gp1 -t ut -d fri -p 50
tapulan add              # or fully interactive — it prompts for everything
tapulan list
tapulan move 12 "next mon" -n "moved for the school fair"
tapulan done 12
```

`tapulan login <url>` pairs with a deployed instance. Each machine gets its own
token (shown once, stored in `~/.tapulan.json`, revocable under **Admin →
Settings → CLI access**). Dates read the way people say them: `today`,
`tomorrow`, `bukas`, `fri`, `next mon`, `+3`, `jul 15`. `tapulan help` lists
everything.

## Data

- **Location:** `data/tapulan.db` (git-ignored, WAL mode). Delete the `data/` folder to reseed from scratch.
- **Backup:** Admin → Settings → *Export backup* downloads a JSON snapshot; *Import backup* restores one.

## Project structure

```
src/
  app/                 routes: / (Today), /week, /calendar, /tasks, /classes, /admin
  actions/             server actions (admin-guarded mutations)
  components/
    ui/                primitives — button, sheet, field, chip, toast, confirm…
    layout/            shell — top bar, bottom nav, theme, strand picker
    schedule/          now-strip, day timeline, week grid, legend
    tasks/             task list, row, detail sheet
    classes/           class cards
    admin/             login, dashboard tabs, editors
  lib/
    db/                connection, schema, seed
    auth/              password + session
    queries/           read-side queries
    domain/            types, time, hues, schedule, tasks, strand (pure)
  hooks/               use-now (live clock), use-done (personal check-offs)
```

See `PRODUCT.md` and `DESIGN.md` for the product and visual-system decisions.
