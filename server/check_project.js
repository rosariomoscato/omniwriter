const Database = require('better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

const project = db.prepare('SELECT * FROM projects WHERE id = ?').get('test-proj-1772875665258');
console.log('Project:', JSON.stringify(project, null, 2));

const user = db.prepare('SELECT * FROM users WHERE id = ?').get('8986f7a1-8268-49e1-a3ba-5cbaeb77ebc8');
console.log('User:', JSON.stringify(user, null, 2));

db.close();
