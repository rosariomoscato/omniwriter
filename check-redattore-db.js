const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server/data/omniwriter.db');
const db = new Database(dbPath);

// Check Redattore project
const project = db.prepare('SELECT id, title, area, settings_json, word_count_target FROM projects WHERE title = ?').get('Test Article 91');
console.log('Redattore Project:');
console.log(JSON.stringify(project, null, 2));

// Parse settings_json
if (project && project.settings_json) {
  console.log('\nParsed settings_json:');
  console.log(JSON.parse(project.settings_json));
}

db.close();
