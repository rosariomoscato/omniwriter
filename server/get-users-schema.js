const db = require('better-sqlite3')('server/data/omniwriter.db');
const s = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
console.log(s.sql);

const m = s.sql.match(/CHECK\(role.*?\)/);
console.log('\n\nRole constraint:');
console.log(m ? m[0] : 'NOT FOUND');

if (s.sql.includes("'user', 'admin'")) {
  console.log('\n✅ CORRECT - Schema has new role constraint');
} else {
  console.log('\n❌ INCORRECT - Schema has old role constraint');
}

db.close();
