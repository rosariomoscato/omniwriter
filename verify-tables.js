const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const database = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

const requiredTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters',
  'chapter_versions', 'characters', 'locations', 'plot_events',
  'human_models', 'human_model_sources', 'sources',
  'generation_logs', 'project_tags', 'export_history', 'user_preferences'
];

const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
const tableNames = tables.map(t => t.name);

console.log('Required tables verification:');
let allPresent = true;
for (const table of requiredTables) {
  const present = tableNames.includes(table);
  console.log(`  ${present ? '✓' : '✗'} ${table}`);
  if (!present) allPresent = false;
}

console.log(`\nAll required tables present: ${allPresent ? 'YES ✓' : 'NO ✗'}`);

// Check foreign keys
const fkResult = database.prepare('PRAGMA foreign_keys').get();
console.log(`\nForeign keys enabled: ${fkResult.foreign_keys === 1 ? 'YES ✓' : 'NO ✗'}`);

database.close();
