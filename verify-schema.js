const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('./server/data/omniwriter.db');

// Feature 3: Verify the test user we created still exists after server operations
// The user was created: test-1771626156723 with email persistence-test-1771626156723@example.com
var testId = 'test-1771626156723';

var user = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(testId);
if (user) {
  console.log('SUCCESS: User persists in database after server operations');
  console.log('User details:', JSON.stringify(user, null, 2));

  // Clean up test user
  db.prepare('DELETE FROM users WHERE id = ?').run(testId);
  console.log('Test user cleaned up');
} else {
  console.log('FAILURE: User NOT found - data was not persisted');
  console.log('This would indicate in-memory storage was used');
  process.exit(1);
}

// Also verify other users exist (from server logs we saw user 1c23253b-f881-4786-9491-3b22da0ae680)
var existingUser = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get('1c23253b-f881-4786-9491-3b22da0ae680');
if (existingUser) {
  console.log('\nVerified existing user also persists:', existingUser.email);
}

db.close();
console.log('\nFeature 3 VERIFIED: Data persists in SQLite database');
