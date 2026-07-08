# Design

Mood: **a control panel, not a website** — Linear-grade density and restraint. Near-black
calm, hairline structure, one cobalt signal, and every other color earning its place as
*data*. Dark is the default (the reference aesthetic and the 10-PM-homework companion);
light and sepia (the logbook on warm paper) are first-class manual choices.

## Shell

- **Desktop (≥1024px):** fixed 220px sidebar on the `--shell` void; content lives in an
  elevated, bordered, rounded panel (`--bg`) that fills the rest of the viewport and
  scrolls independently. No page titles in content — each view owns a sticky 44px toolbar
  (name · mono meta · controls). No max-width containers; views use the full panel.
- **Sidebar anatomy:** strand switcher as the workspace element (colored glyph + code +
  section caption), ⌘K search button, view list (30px items, open-task count on Tasks),
  theme toggle at the foot. **No wordmark anywhere** — the browser tab says Tapulan.
- **Mobile (<1024px):** slim top bar (view title · strand chip · search) + fixed bottom
  tab bar (Today / Week / Tasks / Classes, 52px + safe-area). Content is full-bleed.
- **Admin is invisible.** No student-visible entry: the sidebar/top-bar items render only
  for a signed-in admin; the ⌘K palette lists Admin only once someone deliberately types
  it; `/admin` is the door.
- **Soft first-run gate.** A brand-new device is met once by the landing (`/welcome`) — a
  calm, login-free "inside cover" that prints the real section identity, states the tool's job
  in one sentence, and lets you pick your strand (or take the whole section) from a keyboard-first
  picker whose rows *are* the commit buttons. After that an `onboarded` cookie makes `/` open
  straight to Today, so a returning 6:50 AM glance never sees it again; only the bare `/` is
  gated (middleware), never deep links. A strand is never *required* — without one the app shows
  the whole section (split blocks carry strand chips); picking one just narrows the data, and it
  stays changeable from the switcher. Both choices are cookie-persisted. The landing is
  section-agnostic — identity, strands and the honest "as of today" line all come from the
  database — so another section reuses it unchanged. It is `/welcome`'s own route group (no app
  chrome), synchronous (no `loading.tsx`), and obeys the same restraint as the tool: no gloss,
  no metrics, cobalt only on the focus ring.

## Color

Strategy: **Restrained.** Neutral architecture; cobalt (hue 252) is spent only on
interactivity and "now" (active nav, primary buttons, now-line, today marker). All other
color is data: the 14-hue functional ramp bound to subjects and task types in SQLite.

### Core tokens (OKLCH)

| Role | Dark (default) | Light | Sepia |
|---|---|---|---|
| `--shell` (app void) | `oklch(0.145 0.001 265)` | `oklch(0.955 0.004 90)` | `oklch(0.905 0.042 62)` |
| `--bg` (content panel) | `oklch(0.178 0.001 265)` | `oklch(0.992 0.002 95)` | `oklch(0.952 0.038 65)` |
| `--surface` (cards, inputs) | `oklch(0.205 0.001 265)` | `oklch(0.966 0.004 90)` | `oklch(0.928 0.043 63)` |
| `--surface-2` (active/hover-2) | `oklch(0.245 0.001 265)` | `oklch(0.938 0.005 90)` | `oklch(0.902 0.048 61)` |
| `--pop` (overlays: menus, palette, panels, toasts) | `oklch(0.222 0.001 265)` | `oklch(0.997 0.001 95)` | `oklch(0.966 0.03 67)` |
| `--ink` | `oklch(0.945 0.001 265)` | `oklch(0.32 0.012 80)` | `oklch(0.3 0.04 48)` |
| `--muted` | `oklch(0.715 0.001 265)` | `oklch(0.455 0.012 80)` | `oklch(0.435 0.042 50)` |
| `--faint` (micro-meta, still ≥4.5:1) | `oklch(0.605 0.001 265)` | `oklch(0.55 0.01 80)` | `oklch(0.49 0.038 52)` |
| `--line` / `--line-strong` | `oklch(1 0 0 / 0.07)` / `0.11` | `oklch(0.912 …)` / `0.858` | `oklch(0.867 …)` / `0.802` |
| `--brand` (fills, white text) | `oklch(0.56 0.17 252)` | `oklch(0.5 0.16 252)` | inherits light |
| `--brand-text` (links/active) | `oklch(0.78 0.11 252)` | `oklch(0.47 0.15 252)` | inherits light |

**Sepia** is a light-family theme, not a third color system: only the neutral
architecture (warm-parchment ground, hue ~48–65 — Claude-warm orange-brown, never the
yellow-green highlighter band — with sepia-brown ink), tint strengths, and warm-brown
shadows are overridden; cobalt, the semantic states, and the hue ramp inherit from light
— blue ink and colored data on parchment. The paper (`--bg` ≈ `#ffebd5`) is an aged-manila
warmth you can actually see, not a near-white and not a butter cream: the warmth is
carried by *chroma held at a still-light lightness* rather than by going dark, so the
sheet reads unmistakably sepia while every inherited semantic text colour still clears AA.
The tan shell/desk sits a clear step below the paper so the sidebar keeps its edge. Text
tokens verified ≥4.5:1 on every surface they land on — bg, cards, active rows and the
sidebar. Selected in settings
(System / Light / Dark / Sepia), by name in ⌘K, or via the sidebar toggle's
light → dark → sepia cycle. The theme's `<html>` class is `theme-sepia`, **never**
`.sepia` — Tailwind ships a `sepia` filter utility (`filter: sepia(100%)`) that would
colour-wash the entire app; next-themes remaps the name via its `value` prop.

Semantic states: `--ok` (emerald), `--warn` (amber — tentative/moved), `--danger`
(overdue/destructive), lightness-swapped per theme. Contrast verified ≥4.5:1 for every
text token on `--bg` in every theme.

### Functional hue ramp

14 named hues (`red … rose` + `slate`), text-grade in both themes. Components receive a
hue via the `--a` custom property (`accentStyle(hue)`); `.a-*` utilities derive text,
dots, tints (`--tint` 16/23/30% dark · 9/13/19% light · 10/14/20% sepia), borders,
rings. **No raw hex in components.**

## Typography

- **Geist Sans** for UI; **Geist Mono** for every time, date, count, code and day letter
  (`tabular-nums` everywhere numbers align).
- Product scale: 13px base UI · 12/12.5 meta · 11–10.5 mono micro-labels · 14–15
  panel/now titles · nothing larger. Uppercase micro-labels only in mono, only for data
  (type badges, group headers, day letters) — never section eyebrows.

## Shape & depth

- Radius: 10px overlay panels, 8px cards, 6px controls, full pills.
- Depth by border first: hairline `--line` everywhere; shadows only on overlays
  (`--shadow-pop`, `--shadow-overlay`). Dark mode leans on translucent-white hairlines.
- Hatched slabs (`.hatch`) mark breaks on the week canvas; dashed borders mark fixtures.

## Motion

Vocabulary lives in globals.css; components bind via `usePresence` (mount-through-exit):

- Entrances: `anim-pop` (menus/palette), `anim-detail` (sheet-up on mobile ↔ panel-in on
  desktop via media query), `anim-fade` (backdrops), `anim-toast`, `anim-view` (route
  content, 4px rise).
- Exits keyed on `[data-state="closed"]`: pop-out / sheet-down / panel-out / fade-out.
  Callers never conditional-mount an overlay (`{editing && <Editor open …>}` kills the
  exit mid-flight) — they keep it mounted, drive `open`, and render from a
  `useRetained` snapshot so the closing surface keeps its final content.
- Feedback: `.tap` / `.press` scale-on-active for buttons, chips, checks (70ms);
  `done-pop` + `done-tick` SVG stroke draw on the personal check *and* every form
  Checkbox; sliding thumb on segmented controls; `anim-underline` on tab switches; the
  week's now-line and gutter time chip glide on the minute tick (`transition: top`,
  linear).
- Form pickers are the custom `Select` (popover + menu items, hue dots, per-option
  hints) — never the native `<select>`, which can't carry the app's data-color
  vocabulary or its open/close motion.
- Loading: route-level skeletons mirror each view's exact geometry (`.skeleton`,
  a quiet opacity pulse — never a gradient sweep), so the content swap is a
  no-shift replace. The live "now" dot pulse and the skeleton pulse are the only loops.
- Durations 70–240ms; `--ease` (out-quint) for entrances, `--ease-out`/`--ease-in` for
  exits. Full `prefers-reduced-motion` collapse.

## Layout details

- **Today:** two columns on desktop (timeline · 336px due-soon rail); now-card with live
  progress + next-up; time-gutter rows; breaks as dotted one-liners; strand-split slots
  listed per strand when no strand is chosen.
- **Week:** true time-proportional canvas, hour gutter + rules, full-width blocks colored
  by subject hue with density tiers by block height; greedy interval-column layout for
  overlapping (split) blocks; cobalt now-line through today; mobile gets day tabs + a
  single proportional column.
- **Calendar:** a true month canvas, Monday-first, filling the panel (rows flex to
  viewport; chips-per-cell derived from measured row height, overflow behind a "+n more"
  per-day popover). Deadline chips are type-hued (bar · title · unconfirmed dot · mono
  time); handled work strikes and recedes; open-but-past flips to danger. Day marks reuse
  the week vocabulary in miniature — async wash, hatched no-class, tinted band. Weekends
  sit on a darker wash; adjacent-month days fade; today = cobalt badge. Every day number
  is a peek button (hover circle → the day popover, GCal's day affordance); the toolbar's
  month label opens the **month jumper** — a mini-month popover (fixed six weeks, density
  dots: faint = open work, danger = overdue; footer jumps to today) that pages any
  distance and lands the canvas (and, on mobile, the agenda) on the picked day. Toolbar
  keeps a persistent mono "Today"; ← / → page months, T jumps home. Admins get a
  hover-revealed "+" per cell that opens the task editor seeded with that due date —
  still no student-visible admin surface. Mobile: dot-grid month (type-hue dots, mark
  underline bars, swipe to page) over a selected-day agenda of standard task rows.
  Months page client-side, mirrored to `?m=YYYY-MM`.
- **Tasks:** issue-tracker list — fixed-width aligned columns (check · type badge · title
  + flags · subject · pts · due), sticky bucket headers, type-filter chips with counts.
  Selection lives in the URL (`?task=id`) so ⌘K, Today, and shared links open the same
  right-panel/bottom-sheet detail (Linear-style properties grid + materials list).
- **Classes:** dense rows (dot · code · name · teacher · room · M T W T F meet-dots ·
  open count) grouped Core / per-strand; detail panel with meetings + open requirements.
- z-scale: sticky toolbars/headers (10–20) < menus (30) < detail overlay (40) < palette
  (50) < confirm (60) < toast (70).

## Data honesty

Moved dates render as `old → new` with an amber *unconfirmed* flag until the teacher
confirms; clarification notes are first-class callouts; the personal "done for me" check
is device-local and never mutates the shared status.
