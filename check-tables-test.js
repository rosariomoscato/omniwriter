var Database = require('./server/node_modules/better-sqlite3');
var db = new Database('./server/data/omniwriter.db');

var tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables:', tables.map(function(t){return t.name}).join(', '));

var usersInfo = db.prepare('PRAGMA table_info(users)').all();
console.log('\nUsers columns:');
usersInfo.forEach(function(c) { console.log('  ' + c.name + ' (' + c.type + ')'); });

var hasAdminLogs = tables.some(function(t) { return t.name === 'admin_logs'; });
console.log('\nadmin_logs table exists:', hasAdminLogs);

var admins = db.prepare("SELECT id, email, name, role FROM users WHERE role = 'admin' LIMIT 5").all();
console.log('\nAdmin users:', JSON.stringify(admins));

var count = db.prepare('SELECT COUNT(*) as c FROM users').get();
console.log('Total users:', count.c);

db.close();
