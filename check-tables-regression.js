const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

// List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables found:', tables.length);
console.log('Table names:', tables.map(t => t.name).join(', '));

// Expected tables
const expectedTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions',
  'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources',
  'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences'
];

console.log('\nExpected tables check:');
expectedTables.forEach(t => {
  const exists = tables.some(table => table.name === t);
  console.log(`  ${t}: ${exists ? 'EXISTS' : 'MISSING'}`);
});

// Check users table columns
console.log('\nUsers table columns:');
const usersInfo = db.prepare("PRAGMA table_info(users)").all();
usersInfo.forEach(col => console.log(`  ${col.name} (${col.type})`));

// Check projects table columns
console.log('\nProjects table columns:');
const projectsInfo = db.prepare("PRAGMA table_info(projects)").all();
projectsInfo.forEach(col => console.log(`  ${col.name} (${col.type})`));

// Check chapters table columns
console.log('\nChapters table columns:');
const chaptersInfo = db.prepare("PRAGMA table_info(chapters)").all();
chaptersInfo.forEach(col => console.log(`  ${col.name} (${col.type})`));

// Check foreign keys are enabled
console.log('\nForeign keys check:');
const fkCheck = db.prepare("PRAGMA foreign_keys").get();
console.log('  Foreign keys enabled:', fkCheck.foreign_keys === 1 ? 'YES' : 'NO');

db.close();
