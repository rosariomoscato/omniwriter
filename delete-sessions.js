// Delete all sessions for admin77 user to force new token generation
const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3/lib/database.js');
const dbPath = '/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db';
const db = new Database(dbPath);

// First get the user ID
const user = db.prepare('SELECT id FROM users WHERE email = ?').get('admin77@example.com');
if (user) {
  console.log('User ID:', user.id);

  // Delete all sessions for this user
  const result = db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  console.log('✅ Deleted', result.changes, 'sessions for user admin77@example.com');
} else {
  console.log('User not found');
}

db.close();
