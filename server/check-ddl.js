var Database = require('better-sqlite3');
var db = new Database('server/data/omniwriter.db', { readonly: true });

var sessions = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='sessions'").get();
console.log('Sessions DDL:');
console.log(sessions.sql);

db.close();
