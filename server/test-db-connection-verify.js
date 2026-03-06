const Database = require('better-sqlite3');
const path = require('path');

console.log('Testing database connection...');

try {
  const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
  console.log('Database path:', dbPath);

  const db = new Database(dbPath);

  // Check if we can query the database
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('✓ Database connection successful');
  console.log(`✓ Found ${tables.length} tables`);

  // Check if we can run a simple query
  const result = db.prepare("SELECT COUNT(*) as count FROM migrations").get();
  console.log(`✓ Migrations table exists, count: ${result.count}`);

  db.close();
  console.log('\n✓ Database connection verified successfully!');
  console.log('Database status: connected');

  process.exit(0);
} catch (error) {
  console.error('✗ Database connection failed:', error.message);
  process.exit(1);
}
