const { openDb, runMigrations } = require('../db');

const db = openDb();
runMigrations(db);
console.log('Migrations complete.');
