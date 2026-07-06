# Tapulan

*Tapulan* (Bisaya for **lazy**) — the app does the remembering so you don't have to.

A mobile-first class schedule **and** requirements tracker for a single Philippine Senior High section. Three strands (STEM · ABM · HUMSS) share one timetable with strand-split blocks; everyone sees the version tuned to their track. It answers **what's now, what's next, what's due** in a glance, and records honest history when a date moves.

## Features

- **Live "now" strip** — current period, time remaining, and what's up next, computed from the device clock (never asserted).
- **Time-proportional week grid** on desktop with a live now-line; a swipeable day view on mobile.
- **Requirements tracker** — unit tests, quizzes, assignments, labs, PETAs, projects, events and reminders, each with its own colour, grouped by due date.
- **Honest moved dates** — reschedule a task and it shows `Jul 10 → Jul 14 · Tentative` with a clarification note, for the classic *"miss, pwede po ba i-move ang PETA?"* case.
- **Strand picker** that persists per device (cookie).
- **Admin editing** behind a shared password — add/edit/move/cancel tasks, edit the whole schedule, subjects and teachers, all live for the section.
- **Light & dark** modes, mobile bottom-nav + desktop tabs, full keyboard/screen-reader support, and `prefers-reduced-motion` alternatives.
- **Backup / restore** — export the whole database to JSON and import it back; reset to the seeded program anytime.

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

## Admin

Open **Admin** (gear icon, top-right). The default password is `tapulan` — override it at seed time with the `ADMIN_PASSWORD` env var, or change it later under **Admin → Settings**.

Sessions are an HTTP-only, HMAC-signed cookie (30 days); the password is stored scrypt-hashed. Every mutation is re-checked server-side.

> The client-side gate is a convenience for a trusted class section, not hardened multi-tenant auth. Keep the password among class officers.

## Data

- **Location:** `data/tapulan.db` (git-ignored, WAL mode). Delete the `data/` folder to reseed from scratch.
- **Backup:** Admin → Settings → *Export backup* downloads a JSON snapshot; *Import backup* restores one.

## Project structure

```
src/
  app/                 routes: / (Today), /week, /tasks, /classes, /admin
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
