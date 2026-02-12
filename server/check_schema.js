const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

db.all('SELECT name FROM sqlite_master WHERE type="table" ORDER BY name', [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  console.log('Tables found:');
  rows.forEach(row => console.log(' -', row.name));
  db.close();
});
