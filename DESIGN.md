# Design

Mood: **a control panel, not a website** — Linear-grade density and restraint. Near-black
calm, hairline structure, one cobalt signal, and every other color earning its place as
*data*. Dark is the default (the reference aesthetic and the 10-PM-homework companion);
light is a first-class manual choice.

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
- **No onboarding.** Without a strand the app shows the whole section (split blocks carry
  strand chips); picking a strand in the switcher just narrows the data. Cookie-persisted.

## Color

Strategy: **Restrained.** Neutral architecture; cobalt (hue 252) is spent only on
interactivity and "now" (active nav, primary buttons, now-line, today marker). All other
color is data: the 14-hue functional ramp bound to subjects and task types in SQLite.

### Core tokens (OKLCH)

| Role | Dark (default) | Light |
|---|---|---|
| `--shell` (app void) | `oklch(0.145 0.003 265)` | `oklch(0.962 0.002 265)` |
| `--bg` (content panel) | `oklch(0.178 0.003 265)` | `oklch(0.995 0 0)` |
| `--surface` (cards, inputs) | `oklch(0.205 0.0035 265)` | `oklch(0.972 0.002 265)` |
| `--surface-2` (active/hover-2) | `oklch(0.245 0.004 265)` | `oklch(0.945 0.003 265)` |
| `--pop` (overlays: menus, palette, panels, toasts) | `oklch(0.222 0.004 265)` | `oklch(0.998 0 0)` |
| `--ink` | `oklch(0.945 0.003 265)` | `oklch(0.215 0.012 265)` |
| `--muted` | `oklch(0.715 0.006 265)` | `oklch(0.455 0.012 265)` |
| `--faint` (micro-meta, still ≥4.5:1) | `oklch(0.605 0.007 265)` | `oklch(0.55 0.01 265)` |
| `--line` / `--line-strong` | `oklch(1 0 0 / 0.07)` / `0.11` | `oklch(0.918 …)` / `0.865` |
| `--brand` (fills, white text) | `oklch(0.56 0.17 252)` | `oklch(0.5 0.16 252)` |
| `--brand-text` (links/active) | `oklch(0.78 0.11 252)` | `oklch(0.47 0.15 252)` |

Semantic states: `--ok` (emerald), `--warn` (amber — tentative/moved), `--danger`
(overdue/destructive), lightness-swapped per theme. Contrast verified ≥4.5:1 for every
text token on `--bg` in both themes.

### Functional hue ramp

14 named hues (`red … rose` + `slate`), text-grade in both themes. Components receive a
hue via the `--a` custom property (`accentStyle(hue)`); `.a-*` utilities derive text,
dots, tints (`--tint` 16/23/30% dark · 9/13/19% light), borders, rings. **No raw hex in
components.**

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
- Feedback: `.tap` / `.press` scale-on-active for buttons, chips, checks (70ms);
  `done-pop` + `done-tick` SVG stroke draw on the personal check; sliding thumb on
  segmented controls; the live "now" dot pulse is the only loop.
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
