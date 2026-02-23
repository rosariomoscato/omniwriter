const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('./server/data/omniwriter.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables found:');
tables.forEach(t => console.log(' -', t.name));
console.log('Total tables:', tables.length);

const requiredTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions',
  'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources',
  'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences'
];

const foundTableNames = tables.map(t => t.name);
const missingTables = requiredTables.filter(t => !foundTableNames.includes(t));

if (missingTables.length > 0) {
  console.log('\nMISSING TABLES:', missingTables.join(', '));
} else {
  console.log('\nAll required tables exist!');
}

// Check foreign keys
const fkResult = db.prepare("PRAGMA foreign_keys").get();
console.log('\nForeign keys enabled:', fkResult.foreign_keys === 1 ? 'YES' : 'NO');

db.close();
