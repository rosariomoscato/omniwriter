// Test script to verify database connectivity and health endpoint logic
const Database = require('better-sqlite3');

console.log('=== Testing Database Connection ===\n');

try {
  const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

  // Test 1: Simple query to verify connectivity
  console.log('Test 1: Running test query...');
  const result = db.prepare('SELECT 1 as ok').get();
  console.log(`✓ Test query result: ${result.ok === 1 ? 'PASSED' : 'FAILED'}`);

  // Test 2: Get table count
  console.log('\nTest 2: Counting tables...');
  const tables = db.prepare(
    "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  ).get();
  console.log(`✓ Tables found: ${tables.count}`);

  // Test 3: Verify connection status
  console.log('\nTest 3: Verifying database connection...');
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      status: 'connected',
      type: 'SQLite',
      tables: tables.count,
      test_query: result.ok === 1 ? 'passed' : 'failed',
    },
  };

  console.log('\n=== Health Check Response ===');
  console.log(JSON.stringify(healthStatus, null, 2));

  console.log('\n=== Verification Complete ===');
  console.log('✓ Database connection established');
  console.log('✓ Database status: connected');
  console.log('✓ No connection errors');

  db.close();
} catch (error) {
  console.error('\n✗ Database connection failed:');
  console.error(error.message);
  process.exit(1);
}
