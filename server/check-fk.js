const Database = require('better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db', { readonly: true });

// Check pragma settings
console.log('=== Database Pragma Settings ===');
const fk = db.pragma('foreign_keys', { simple: true });
console.log('foreign_keys:', fk);

const journal = db.pragma('journal_mode', { simple: true });
console.log('journal_mode:', journal);

db.close();
