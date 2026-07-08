# Product

## Register

product

## Users

A Grade 12 senior-high section in the Philippines (STEM · ABM · HUMSS strands share one schedule with strand-split blocks). Students check it on their phones at 6:50 AM on the commute ("what's first period? what's due?") and again at night while doing homework. A few trusted people (beadle / class officers) hold the admin password and keep tasks and the schedule accurate. Everyone else is read-only.

## Product Purpose

The section's single source of truth for **when classes meet** and **what work is due** — unit tests, quizzes, assignments, labs, PETAs, projects. It exists because requirements get announced verbally, half-remembered, and re-asked in the group chat daily. Success: a student answers "what's now, what's next, what's due" in one glance, and when a date moves ("miss, pwede po ba i-move ang PETA?") the app records the move honestly — old date, new date, and whether it's confirmed yet.

## Brand Personality

Precise, calm, quietly funny. "Tapulan" is Bisaya for *lazy* — the joke is the app does the remembering so you can be. The humor lives in copy corners (empty states, the name), never in the interface itself, which behaves like a well-kept logbook: monospaced times, exact dates, honest statuses.

## Anti-references

- LMS clutter (Moodle, Canvas, Google Classroom): no announcement soup, no nested modules, no engagement widgets.
- Gamified study apps: no streaks, XP, mascots, or confetti.
- SaaS landing gloss: no hero metrics, no gradient text, no marketing sections. The one landing
  we do have (`/welcome`, a first-run onboarding cover) obeys this too — the section's real name
  is the only large element, the sole "stat" is an honest request-time reading of the section's
  actual state, and there is no promo section, illustration, or success flourish.

## Design Principles

1. **Glanceable before 7 AM.** The home screen answers now / next / due-soon without a single tap. Live state (current period, time left) is computed, never asserted.
2. **Color is meaning.** Every hue is bound to a subject or a task type and comes from the database. Neutral surfaces everywhere else; the accent budget is spent on data, not decoration.
3. **Truth over tidiness.** Moved and unconfirmed dates are first-class states with visible history ("Jul 10 → Jul 14 · unconfirmed"), never silent edits.
4. **One thumb.** Primary navigation sits at the bottom on mobile; every control is reachable and ≥44px. Desktop gets density, not a different product.
5. **The tool disappears.** Familiar product vocabulary (Linear-grade restraint) and instant loads — when the network does make us wait, geometry-true skeletons hold the layout so nothing shifts. Motion is fast, purposeful micro-interaction (press, hover, enter/exit ≤240ms) that never makes a hurrying student wait — and always yields to `prefers-reduced-motion`.
6. **The admin door is invisible.** Students never see an Admin entry — it surfaces only for a signed-in admin, or when someone deliberately types it into search (or visits /admin). Editing power is real but never advertised.

## Accessibility & Inclusion

WCAG AA: body text ≥4.5:1 in every theme, status never encoded by color alone (always paired with a label), visible focus rings, `prefers-reduced-motion` alternatives for the live pulse and transitions, semantic landmarks, and honest `<time>` elements. Works on cheap Android phones: no heavy assets, system-grade fonts shipped locally.
