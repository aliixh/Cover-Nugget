// Database bootstrap using expo-sqlite's async API.
//
// A single shared connection is opened lazily and reused across the app.
// `initDatabase()` runs the schema and records the schema version so future
// migrations can branch on it.

import * as SQLite from "expo-sqlite";
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from "./schema";

const DB_NAME = "covernugget.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Opens (once) and returns the shared database connection. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

/**
 * Creates tables if needed and stamps the schema version.
 * Safe to call on every app launch.
 */
export async function initDatabase(): Promise<void> {
  const db = await getDb();
  // execAsync runs a multi-statement SQL script (no bound params).
  await db.execAsync(CREATE_TABLES_SQL);
  await runMigrations(db);
  await db.runAsync(
    "INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)",
    String(SCHEMA_VERSION)
  );
}

/** Adds a column to a table if it doesn't already exist (idempotent). */
async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  type: string
): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!cols.some((c) => c.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

/**
 * Lightweight, additive migrations for installs created before a column
 * existed. CREATE TABLE IF NOT EXISTS never alters an existing table, so new
 * columns are added here. Safe to run every launch.
 */
async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // v2: cover letters got a user-editable title.
  await ensureColumn(db, "cover_letters", "title", "TEXT");
  // v3: optional per-letter length limit (word/char).
  await ensureColumn(db, "cover_letters", "limit_type", "TEXT");
  await ensureColumn(db, "cover_letters", "limit_value", "INTEGER");
  // v4: GPA on education.
  await ensureColumn(db, "education", "gpa", "TEXT");
}

/**
 * Test/dev helper: drops all rows. Not wired into the UI.
 * (Kept for future "Reset app" in Settings.)
 */
export async function wipeDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM additional_info;
    DELETE FROM certifications;
    DELETE FROM skills;
    DELETE FROM projects;
    DELETE FROM volunteer;
    DELETE FROM experience;
    DELETE FROM education;
    DELETE FROM cover_letters;
    DELETE FROM ai_settings;
    DELETE FROM profile;
  `);
}
