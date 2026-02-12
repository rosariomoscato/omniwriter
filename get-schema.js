var Database = require('./server/node_modules/better-sqlite3');
var db = new Database('./data/omniwriter.db');
var result = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
console.log(result.sql);
db.close();
