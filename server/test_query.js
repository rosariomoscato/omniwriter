const Database = require('better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

try {
  const query = `SELECT p.*, u.name as author_name FROM projects p LEFT JOIN users u ON p.user_id = u.id WHERE p.id = ? AND p.user_id = ?`;
  const result = db.prepare(query).get('test-proj-1772875665258', '8986f7a1-8268-49e1-a3ba-5cbaeb77ebc8');
  console.log('Query result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Error:', error);
}

db.close();
