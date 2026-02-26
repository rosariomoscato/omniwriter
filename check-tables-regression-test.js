const Database = require('./server/node_modules/better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data', 'omniwriter.db');
console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath);

  // Get all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('\n=== Tables found:', tables.length, '===');
  tables.forEach(t => console.log(' -', t.name));

  // Required tables per Feature 2
  const requiredTables = [
    'users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions',
    'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources',
    'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences'
  ];

  const foundTableNames = tables.map(t => t.name);

  console.log('\n=== Checking required tables ===');
  let allPresent = true;
  for (const table of requiredTables) {
    const present = foundTableNames.includes(table);
    console.log(`${present ? '✓' : '✗'} ${table}`);
    if (!present) allPresent = false;
  }

  // Check key columns on users table
  console.log('\n=== Users table columns ===');
  const usersColumns = db.prepare("PRAGMA table_info(users)").all();
  usersColumns.forEach(col => console.log(' -', col.name, '(' + col.type + ')'));

  // Check key columns on projects table
  console.log('\n=== Projects table columns ===');
  const projectsColumns = db.prepare("PRAGMA table_info(projects)").all();
  projectsColumns.forEach(col => console.log(' -', col.name, '(' + col.type + ')'));

  // Check key columns on chapters table
  console.log('\n=== Chapters table columns ===');
  const chaptersColumns = db.prepare("PRAGMA table_info(chapters)").all();
  chaptersColumns.forEach(col => console.log(' -', col.name, '(' + col.type + ')'));

  // Check foreign keys are enabled
  console.log('\n=== Foreign key check ===');
  const fkCheck = db.prepare("PRAGMA foreign_keys").get();
  console.log('Foreign keys enabled:', fkCheck ? fkCheck.foreign_keys || 'N/A' : 'N/A');

  db.close();

  console.log('\n=== RESULT ===');
  console.log(allPresent ? 'All required tables present: PASS' : 'Missing tables: FAIL');

} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
