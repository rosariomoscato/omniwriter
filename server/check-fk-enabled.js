var Database = require('better-sqlite3');

// Open database WITHOUT setting FK pragma
var db1 = new Database('server/data/omniwriter.db', { readonly: true });
console.log('Without FK pragma:', db1.pragma('foreign_keys', { simple: true }));
db1.close();

// Open database WITH FK pragma (like the server does)
var db2 = new Database('server/data/omniwriter.db', { readonly: true });
db2.pragma('foreign_keys = ON');
console.log('With FK pragma:', db2.pragma('foreign_keys', { simple: true }));
db2.close();
