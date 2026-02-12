const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server/data/omniwriter.db');

try {
  console.log('Testing database connection...');
  console.log('Database path:', dbPath);

  const db = new Database(dbPath);

  // Test a simple query
  const result = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log('✓ Database connection successful');
  console.log('✓ Users in database:', result.count);

  // Check tables exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('✓ Tables in database:', tables.map(t => t.name).join(', '));

  db.close();
  console.log('✓ Database connection test PASSED');
  process.exit(0);
} catch (error) {
  console.error('✗ Database connection FAILED:', error.message);
  process.exit(1);
}
