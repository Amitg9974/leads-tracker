const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DEFAULT_FILE = path.join(__dirname, '..', 'data', 'leads.db');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS leads (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    email     TEXT NOT NULL UNIQUE COLLATE NOCASE,
    phone     TEXT,
    status    TEXT NOT NULL DEFAULT 'new'
              CHECK (status IN ('new', 'contacted', 'qualified', 'lost')),
    createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    leadId    INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    content   TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_notes_leadId ON notes(leadId);
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
`;

/** Opens (and migrates) a SQLite database. Pass ':memory:' for tests. */
function createDb(file = process.env.DB_PATH || DEFAULT_FILE) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON'); // needed for ON DELETE CASCADE
  db.exec(SCHEMA);
  return db;
}

module.exports = { createDb };
