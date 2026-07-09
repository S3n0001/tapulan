/** SQLite DDL. Applied on every open; every statement is idempotent. */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS strands (
  code    TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  hue     TEXT NOT NULL DEFAULT 'slate'
);

CREATE TABLE IF NOT EXISTS teachers (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS subjects (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  short      TEXT NOT NULL,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  strand     TEXT REFERENCES strands(code) ON DELETE SET NULL,
  hue        TEXT NOT NULL DEFAULT 'slate',
  room       TEXT
);

CREATE TABLE IF NOT EXISTS periods (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  day        INTEGER NOT NULL CHECK (day BETWEEN 1 AND 5),
  start_min  INTEGER NOT NULL,
  end_min    INTEGER NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'class' CHECK (kind IN ('class','break','fixture')),
  label      TEXT,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  strand     TEXT REFERENCES strands(code) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_periods_day ON periods(day, start_min);

-- Calendar overrides for a single date: the day is asynchronous (no physical
-- class) or has no class at all. One mark per date takes over that day's
-- rendering in Today and Week. The weekly periods template is unchanged.
CREATE TABLE IF NOT EXISTS day_marks (
  date  TEXT PRIMARY KEY,                       -- YYYY-MM-DD (local)
  kind  TEXT NOT NULL CHECK (kind IN ('async','no_class')),
  label TEXT,                                   -- optional title override
  note  TEXT                                    -- optional clarification
);

CREATE TABLE IF NOT EXISTS task_types (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL,
  short TEXT NOT NULL,
  hue   TEXT NOT NULL DEFAULT 'slate',
  sort  INTEGER NOT NULL DEFAULT 0
);

-- A repeating requirement (e.g. "weekly journal, every Friday"). The rule is
-- expanded once into concrete task rows; this row only remembers the pattern
-- so the whole series can be described and deleted as one.
CREATE TABLE IF NOT EXISTS task_series (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  freq       TEXT NOT NULL CHECK (freq IN ('daily','weekly','monthly')),
  interval   INTEGER NOT NULL DEFAULT 1,       -- every N weeks/months
  weekdays   TEXT,                             -- weekly: CSV of 1-5 (Mon-Fri)
  nth        INTEGER,                          -- monthly: 1-5 = nth, -1 = last
  weekday    INTEGER,                          -- monthly: 1-5 (Mon-Fri)
  start_date TEXT NOT NULL,                    -- YYYY-MM-DD
  end_date   TEXT,                             -- inclusive; null when by count
  count      INTEGER,                          -- occurrences; null when by end_date
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  details    TEXT NOT NULL DEFAULT '',
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  -- optional second class for a collab requirement (e.g. CPAR × PE); the task
  -- belongs to both. SET NULL so dropping that subject just ends the collab.
  secondary_subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  -- the repeating series this occurrence came from, if any. SET NULL so
  -- deleting a series can orphan (keep) past occurrences as standalone tasks.
  series_id  INTEGER REFERENCES task_series(id) ON DELETE SET NULL,
  type_id    INTEGER NOT NULL REFERENCES task_types(id),
  due_date   TEXT NOT NULL,
  due_time   INTEGER,
  status     TEXT NOT NULL DEFAULT 'confirmed'
             CHECK (status IN ('confirmed','tentative','done','cancelled')),
  -- section-wide "finished during class" marker (admin-set, 0/1). Distinct
  -- from the per-device personal "done for me" and from status='done'.
  done_in_class INTEGER NOT NULL DEFAULT 0,
  -- sat *during* the class meeting (UT/quiz/oral), so its time comes from the
  -- schedule, not an end-of-day deadline. Prospective; distinct from done_in_class.
  held_in_class INTEGER NOT NULL DEFAULT 0,
  moved_from TEXT,
  cancel_reason TEXT,                          -- why it was called off (only when cancelled)
  note       TEXT,
  points     INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);

CREATE TABLE IF NOT EXISTS task_links (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label   TEXT NOT NULL,
  url     TEXT NOT NULL,
  kind    TEXT NOT NULL DEFAULT 'link' CHECK (kind IN ('link','file')),
  sort    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_task_links_task ON task_links(task_id);

-- personal-access tokens for the CLI; only the SHA-256 digest is stored
CREATE TABLE IF NOT EXISTS api_tokens (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash   TEXT NOT NULL UNIQUE,
  label        TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  last_used_at TEXT
);

-- shared admin-login rate limiter (web + CLI), keyed by client IP so state
-- survives redeploys instead of living in a module-level Map
CREATE TABLE IF NOT EXISTS login_attempts (
  key   TEXT PRIMARY KEY,   -- client IP (or a constant fallback if unknown)
  count INTEGER NOT NULL DEFAULT 0,
  until INTEGER NOT NULL DEFAULT 0   -- epoch ms; lockout expiry
);

-- Individual (personal) calendars: an admin-curated weekly schedule for one
-- person or purpose — a work roster, someone's class timetable, a duty rota.
-- Separate from the section's class periods: any weekday including weekends,
-- no subject/strand binding, and gated by the published flag (visible to
-- everyone in Settings when set, an admin-only draft otherwise).
CREATE TABLE IF NOT EXISTS calendars (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  subtitle   TEXT,                         -- optional: whose / what it is
  hue        TEXT NOT NULL DEFAULT 'slate',
  published  INTEGER NOT NULL DEFAULT 0,   -- 1 = shown to everyone in Settings
  sort       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- One recurring weekly time block on a calendar (e.g. "Work · Mon 9:00–17:00").
CREATE TABLE IF NOT EXISTS calendar_blocks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  calendar_id INTEGER NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  day         INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6),  -- 0 = Sun … 6 = Sat
  start_min   INTEGER NOT NULL,
  end_min     INTEGER NOT NULL,
  label       TEXT NOT NULL,
  note        TEXT
);
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_cal ON calendar_blocks(calendar_id, day, start_min);
`;
