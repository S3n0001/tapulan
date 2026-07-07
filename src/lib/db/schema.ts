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

CREATE TABLE IF NOT EXISTS tasks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  details    TEXT NOT NULL DEFAULT '',
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  type_id    INTEGER NOT NULL REFERENCES task_types(id),
  due_date   TEXT NOT NULL,
  due_time   INTEGER,
  status     TEXT NOT NULL DEFAULT 'confirmed'
             CHECK (status IN ('confirmed','tentative','done','cancelled')),
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
`;
