const Database = require('better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db', { readonly: true });

const users = db.prepare('SELECT id, email, name, created_at FROM users ORDER BY created_at DESC LIMIT 5').all();

console.log('=== RECENT USERS IN DATABASE ===');
if (users.length === 0) {
  console.log('No users found');
} else {
  users.forEach(user => {
    console.log(`- ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Created: ${user.created_at}`);
    console.log('');
  });
}

db.close();
