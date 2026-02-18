const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath);

try {
  console.log('=== VERIFYING DATA PERSISTENCE ===');
  console.log('Database file:', dbPath);
  console.log('File exists:', require('fs').existsSync(dbPath) ? '✅ YES' : '❌ NO');

  // Check if any test user exists
  const testUsers = db.prepare("SELECT * FROM users WHERE email LIKE 'test-persistence-%@example.com' ORDER BY created_at DESC LIMIT 5").all();

  if (testUsers.length > 0) {
    console.log(`\n✅ Found ${testUsers.length} test user(s) in database:`);
    testUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.name})`);
      console.log(`     Created: ${user.created_at}`);
    });

    // Clean up test users
    console.log('\n=== CLEANING UP TEST DATA ===');
    const deleteStmt = db.prepare("DELETE FROM users WHERE email LIKE 'test-persistence-%@example.com'");
    const deleted = deleteStmt.run();
    console.log(`✅ Deleted ${deleted.changes} test user(s)`);
  } else {
    console.log('\n❌ NO TEST USERS FOUND - DATA MAY NOT BE PERSISTING');
  }

  // Show total user count
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log(`\nTotal users in database: ${totalUsers.count}`);

} finally {
  db.close();
}
