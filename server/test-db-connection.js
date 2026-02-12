// Test script to verify database connection (Feature 1)
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');

console.log('[Test] Testing database connection...');
console.log('[Test] Database path:', dbPath);

try {
  // Connect to database
  const db = new Database(dbPath);

  // Test query
  const result = db.prepare('SELECT 1 as ok').get();
  console.log('[Test] Database query result:', result);

  // Get table count
  const tables = db.prepare(
    "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  ).get();
  console.log('[Test] Tables in database:', tables.count);

  // Verify connection
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  console.log('[Test] Pragmas set successfully');

  console.log('[Test] ✅ Database connection established successfully');
  console.log('[Test] Database status: connected');

  db.close();
  process.exit(0);
} catch (error) {
  console.error('[Test] ❌ Database connection failed:', error.message);
  process.exit(1);
}
