const Database = require('./server/node_modules/better-sqlite3');
const fs = require('fs');

const db = new Database('./data/omniwriter.db');
const user = db.prepare("SELECT * FROM users WHERE email LIKE 'regression-%@test.omniwriter' ORDER BY created_at DESC LIMIT 1").get();

if (user) {
  console.log('Test user found before restart:');
  console.log('  ID:', user.id);
  console.log('  Email:', user.email);
  console.log('  Name:', user.name);

  // Save to file for after-restart verification
  fs.writeFileSync('./regression-user-before.json', JSON.stringify(user));
  console.log('Saved to ./regression-user-before.json');
  process.exit(0);
} else {
  console.log('No test user found');
  process.exit(1);
}
