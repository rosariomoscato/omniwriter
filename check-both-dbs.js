const Database = require('better-sqlite3');

console.log('=== Database 1: /Users/rosario/CODICE/omniwriter/server/data/omniwriter.db ===');
try {
  const db1 = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db', { readonly: true });
  const users1 = db1.prepare('SELECT COUNT(*) as count FROM users').get();
  const recent1 = db1.prepare('SELECT email, created_at FROM users ORDER BY created_at DESC LIMIT 3').all();
  console.log('User count:', users1.count);
  console.log('Recent users:', recent1);
  db1.close();
} catch (e) {
  console.log('Error:', e.message);
}

console.log('\n=== Database 2: /Users/rosario/CODICE/omniwriter/data/omniwriter.db ===');
try {
  const db2 = new Database('/Users/rosario/CODICE/omniwriter/data/omniwriter.db', { readonly: true });
  const users2 = db2.prepare('SELECT COUNT(*) as count FROM users').get();
  const recent2 = db2.prepare('SELECT email, created_at FROM users ORDER BY created_at DESC LIMIT 3').all();
  console.log('User count:', users2.count);
  console.log('Recent users:', recent2);
  db2.close();
} catch (e) {
  console.log('Error:', e.message);
}
