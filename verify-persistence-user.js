var Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
var fs = require('fs');

// Load test data
var testData = JSON.parse(fs.readFileSync('/tmp/feature3_test_data.json', 'utf8'));
console.log('=== Verifying User After Server Restart ===');
console.log('Looking for user:', testData.email);
console.log('User ID:', testData.userId);

var db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db', { readonly: true });

// Check if user exists
var user = db.prepare('SELECT * FROM users WHERE email = ?').get(testData.email);

if (user) {
  console.log('\n✓ SUCCESS: User found in database after restart!');
  console.log('  - ID:', user.id);
  console.log('  - Email:', user.email);
  console.log('  - Name:', user.name);
  console.log('  - Role:', user.role);
  console.log('  - Created:', user.created_at);
  console.log('\n✓ FEATURE 3 PASSES: Data persists across server restart');
} else {
  console.log('\n✗ FAILURE: User NOT found after restart!');
  console.log('\n✗ REGRESSION DETECTED: Data is NOT persisting (in-memory storage?)');
  console.log('\nThis is a CRITICAL FAILURE - the database is not persisting data.');
  process.exit(1);
}

db.close();
