// SQLite schema (spec section 18).
//
// A single SQL string executed once on startup. `IF NOT EXISTS` makes it safe
// to run every launch. `SCHEMA_VERSION` + the meta table let us add lightweight
// migrations later without wiping user data.

export const SCHEMA_VERSION = 6;

export const CREATE_TABLES_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS profile (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL,
  email     TEXT,
  phone     TEXT,
  location  TEXT,
  linkedin  TEXT,
  portfolio TEXT
);

CREATE TABLE IF NOT EXISTS education (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id      INTEGER NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  school          TEXT,
  degree          TEXT,
  major           TEXT,
  minor           TEXT,
  graduation_year TEXT,
  coursework      TEXT,
  gpa             TEXT
);

CREATE TABLE IF NOT EXISTS experience (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id   INTEGER NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  company      TEXT,
  role         TEXT,
  dates        TEXT,
  description  TEXT,
  achievements TEXT
);

CREATE TABLE IF NOT EXISTS volunteer (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id   INTEGER NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  organization TEXT,
  role         TEXT,
  dates        TEXT,
  description  TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id   INTEGER NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  name         TEXT,
  technologies TEXT,
  description  TEXT,
  results      TEXT
);

CREATE TABLE IF NOT EXISTS skills (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  skill      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS certifications (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id   INTEGER NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  name         TEXT,
  organization TEXT,
  date         TEXT
);

CREATE TABLE IF NOT EXISTS additional_info (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id  INTEGER NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  awards      TEXT,
  publications TEXT,
  languages   TEXT,
  leadership  TEXT,
  other       TEXT
);

CREATE TABLE IF NOT EXISTS cover_letters (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT,
  company     TEXT,
  role        TEXT,
  content     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  limit_type  TEXT,
  limit_value INTEGER,
  format_key  TEXT,
  updated_at  TEXT
);

CREATE TABLE IF NOT EXISTS ai_settings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  instruction TEXT NOT NULL
);
`;
