const Database = require('better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db', { readonly: true });

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
console.log('Tables found:', tables.map(t => t.name));

// Required tables
const requiredTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters',
  'chapter_versions', 'characters', 'locations', 'plot_events',
  'human_models', 'human_model_sources', 'sources', 'generation_logs',
  'project_tags', 'export_history', 'user_preferences'
];

console.log('\nRequired tables check:');
const foundTables = tables.map(t => t.name);
let allPresent = true;
for (const table of requiredTables) {
  const present = foundTables.includes(table);
  console.log(`  ${present ? '✓' : '✗'} ${table}`);
  if (!present) allPresent = false;
}

// Check key columns on users table
console.log('\nusers table columns:');
const usersColumns = db.prepare("PRAGMA table_info(users)").all();
console.log('  ', usersColumns.map(c => c.name).join(', '));

// Check key columns on projects table
console.log('\nprojects table columns:');
const projectsColumns = db.prepare("PRAGMA table_info(projects)").all();
console.log('  ', projectsColumns.map(c => c.name).join(', '));

// Check key columns on chapters table
console.log('\nchapters table columns:');
const chaptersColumns = db.prepare("PRAGMA table_info(chapters)").all();
console.log('  ', chaptersColumns.map(c => c.name).join(', '));

// Check foreign keys
console.log('\nForeign keys enabled:');
const fk = db.prepare("PRAGMA foreign_keys").get();
console.log('  ', fk);

db.close();
console.log(allPresent ? '\n✓ All required tables present' : '\n✗ Some tables missing');
