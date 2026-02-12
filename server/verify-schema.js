const Database = require('better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db', { readonly: true });

// Expected tables from app_spec.txt
const expectedTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions',
  'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources',
  'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences',
  'password_reset_tokens', 'citations'
];

console.log('=== EXPECTED TABLES VERIFICATION ===');
const actualTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
const actualTableNames = actualTables.map(t => t.name);

let allTablesPresent = true;
expectedTables.forEach(table => {
  const exists = actualTableNames.includes(table);
  console.log(`${exists ? '✓' : '✗'} ${table}`);
  if (!exists) allTablesPresent = false;
});

// Check for unexpected tables
const unexpectedTables = actualTableNames.filter(t => !expectedTables.includes(t));
if (unexpectedTables.length > 0) {
  console.log('\n=== UNEXPECTED TABLES ===');
  unexpectedTables.forEach(t => console.log('? ' + t));
}

console.log('\n=== FOREIGN KEYS STATUS ===');
const fk = db.prepare('PRAGMA foreign_keys').get();
console.log(`Foreign keys enabled: ${fk.foreign_keys === 1 ? '✓ Yes' : '✗ No'}`);

console.log('\n=== USERS TABLE KEY COLUMNS ===');
const usersColumns = db.prepare('PRAGMA table_info(users)').all();
const expectedUserColumns = ['id', 'email', 'password_hash', 'name', 'role', 'created_at'];
expectedUserColumns.forEach(col => {
  const exists = usersColumns.some(c => c.name === col);
  console.log(`${exists ? '✓' : '✗'} users.${col}`);
});

console.log('\n=== PROJECTS TABLE KEY COLUMNS ===');
const projectsColumns = db.prepare('PRAGMA table_info(projects)').all();
const expectedProjectColumns = ['id', 'user_id', 'title', 'area', 'status', 'created_at'];
expectedProjectColumns.forEach(col => {
  const exists = projectsColumns.some(c => c.name === col);
  console.log(`${exists ? '✓' : '✗'} projects.${col}`);
});

console.log('\n=== CHAPTERS TABLE KEY COLUMNS ===');
const chaptersColumns = db.prepare('PRAGMA table_info(chapters)').all();
const expectedChapterColumns = ['id', 'project_id', 'title', 'content', 'order_index', 'status'];
expectedChapterColumns.forEach(col => {
  const exists = chaptersColumns.some(c => c.name === col);
  console.log(`${exists ? '✓' : '✗'} chapters.${col}`);
});

console.log('\n=== RESULT ===');
if (allTablesPresent && fk.foreign_keys === 1) {
  console.log('✓ Database schema is correctly applied');
  process.exit(0);
} else {
  console.log('✗ Database schema has issues');
  process.exit(1);
}

db.close();
