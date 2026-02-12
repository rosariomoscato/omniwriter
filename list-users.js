// Simple script to list users from database using the server's module
const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3/lib/database.js');
const dbPath = '/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db';
const db = new Database(dbPath);

const users = db.prepare('SELECT id, email, name, role FROM users').all();

console.log('=== Users in Database ===\n');
if (users.length === 0) {
  console.log('No users found.');
} else {
  users.forEach(user => {
    console.log(`ID: ${user.id} | Email: ${user.email} | Name: ${user.name} | Role: ${user.role}`);
  });
}

db.close();
