const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
console.log('[Test] Connecting to database at:', dbPath);

try {
  const db = new Database(dbPath, { readonly: true });

  // Test 1: List all tables
  console.log('\n[Test] Listing all tables:');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('Tables found:', tables.map(t => t.name));

  // Test 2: Check if key tables exist
  const requiredTables = ['users', 'sessions', 'projects', 'chapters', 'characters', 'locations', 'plot_events', 'sources', 'human_models'];
  console.log('\n[Test] Verifying required tables:');
  requiredTables.forEach(table => {
    const exists = tables.some(t => t.name === table);
    console.log(`  ${table}: ${exists ? '✓' : '✗'}`);
  });

  // Test 3: Check users table structure
  console.log('\n[Test] Users table structure:');
  const usersInfo = db.prepare("PRAGMA table_info(users)").all();
  usersInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });

  // Test 4: Check if foreign keys are enabled
  const fkStatus = db.prepare("PRAGMA foreign_keys").get();
  console.log('\n[Test] Foreign keys enabled:', fkStatus.foreign_keys === 1 ? 'Yes' : 'No');

  // Test 5: Count rows in key tables
  console.log('\n[Test] Row counts:');
  requiredTables.slice(0, 5).forEach(table => {
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      console.log(`  ${table}: ${count.count} rows`);
    } catch (e) {
      console.log(`  ${table}: Error - ${e.message}`);
    }
  });

  db.close();
  console.log('\n[Test] ✓ Database connection test PASSED');
  process.exit(0);
} catch (error) {
  console.error('\n[Test] ✗ Database connection test FAILED:', error.message);
  process.exit(1);
}
