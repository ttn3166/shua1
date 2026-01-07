const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function openDb() {
  ensureDir(DB_PATH);
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  return db;
}

function runMigrations(db) {
  const migrationTable = "CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, run_at TEXT NOT NULL)";
  db.exec(migrationTable);
  const applied = new Set(
    db.prepare('SELECT name FROM migrations').all().map((row) => row.name)
  );
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('.sql'));
  files.sort();
  const insert = db.prepare('INSERT INTO migrations (name, run_at) VALUES (?, datetime(\'now\'))');
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    db.exec(sql);
    insert.run(file);
  }
}

module.exports = { openDb, runMigrations, DB_PATH };
