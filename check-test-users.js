var Database = require('./server/node_modules/better-sqlite3');
var db = new Database('./data/omniwriter.db');
var user = db.prepare("SELECT * FROM users WHERE email LIKE 'feature3-test%'").get();
if (user) {
  console.log('Found test user:', JSON.stringify(user, null, 2));
} else {
  console.log('No test user found');
}
var count = db.prepare('SELECT COUNT(*) as count FROM users').get();
console.log('Total users:', count.count);
db.close();
