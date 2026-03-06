const db = require('better-sqlite3')('server/data/omniwriter.db');
const t = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', t.length);
t.forEach(x => console.log('  -', x.name));
db.close();
