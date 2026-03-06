// Cleanup test user from Feature 3 persistence test
var Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
var fs = require('fs');

var testData = JSON.parse(fs.readFileSync('/tmp/feature3_test_data.json', 'utf8'));
var db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

db.prepare('DELETE FROM users WHERE email = ?').run(testData.email);
console.log('✓ Test user cleaned up:', testData.email);

db.close();
