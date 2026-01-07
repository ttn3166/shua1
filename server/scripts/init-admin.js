const bcrypt = require('bcryptjs');
const { openDb, runMigrations } = require('../db');

const username = process.env.INIT_ADMIN_USERNAME || 'admin';
const password = process.env.INIT_ADMIN_PASSWORD || 'ChangeMe123!';

const db = openDb();
runMigrations(db);

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
if (existing) {
  console.log('Admin already exists.');
  process.exit(0);
}

const hash = bcrypt.hashSync(password, 10);
const result = db
  .prepare('INSERT INTO users (username, password_hash, role, scope, status) VALUES (?, ?, ?, ?, ?)')
  .run(username, hash, 'SuperAdmin', 'global', 'active');
console.log(`Admin created with id ${result.lastInsertRowid}`);
