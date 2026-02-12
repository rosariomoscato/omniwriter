const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

const user = db.prepare('SELECT id FROM users WHERE email = ?').get('test-17-valid@example.com');
console.log('User ID:', user?.id);

if (user) {
  const projects = db.prepare('SELECT id, title FROM projects WHERE user_id = ? LIMIT 5').all(user.id);
  console.log('Projects:', JSON.stringify(projects, null, 2));
}
