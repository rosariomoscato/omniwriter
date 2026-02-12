const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data/omniwriter.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath, { readonly: true });

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('\n=== TABLES ===');
console.log('Total tables:', tables.length);
tables.forEach(t => console.log('  -', t.name));

// Expected tables from feature 2
const expectedTables = [
  'users', 'sessions', 'password_reset_tokens', 'sagas', 'projects', 'chapters',
  'chapter_versions', 'characters', 'locations', 'plot_events', 'human_models',
  'human_model_sources', 'sources', 'generation_logs', 'project_tags',
  'citations', 'export_history', 'user_preferences', 'chapter_comments'
];

console.log('\n=== EXPECTED TABLES CHECK ===');
expectedTables.forEach(tableName => {
  const exists = tables.some(t => t.name === tableName);
  console.log(`${exists ? '✓' : '✗'} ${tableName}`);
});

// Check key columns on users table
console.log('\n=== USERS TABLE COLUMNS ===');
const usersColumns = db.prepare("PRAGMA table_info(users)").all();
console.log('Total columns:', usersColumns.length);
const expectedUserCols = ['id', 'email', 'password_hash', 'name', 'role', 'created_at', 'updated_at'];
expectedUserCols.forEach(col => {
  const exists = usersColumns.some(c => c.name === col);
  console.log(`${exists ? '✓' : '✗'} ${col}`);
});

// Check key columns on projects table
console.log('\n=== PROJECTS TABLE COLUMNS ===');
const projectsColumns = db.prepare("PRAGMA table_info(projects)").all();
const expectedProjectCols = ['id', 'user_id', 'saga_id', 'title', 'area', 'status', 'created_at', 'updated_at'];
expectedProjectCols.forEach(col => {
  const exists = projectsColumns.some(c => c.name === col);
  console.log(`${exists ? '✓' : '✗'} ${col}`);
});

// Check key columns on chapters table
console.log('\n=== CHAPTERS TABLE COLUMNS ===');
const chaptersColumns = db.prepare("PRAGMA table_info(chapters)").all();
const expectedChapterCols = ['id', 'project_id', 'title', 'content', 'order_index', 'status', 'created_at', 'updated_at'];
expectedChapterCols.forEach(col => {
  const exists = chaptersColumns.some(c => c.name === col);
  console.log(`${exists ? '✓' : '✗'} ${col}`);
});

// Check foreign keys are enabled
console.log('\n=== FOREIGN KEYS ===');
// Enable FK like the server does
db.pragma('foreign_keys = ON');
const fkStatus = db.pragma('foreign_keys');
console.log(`Foreign keys: ${fkStatus === 1 ? '✓ ENABLED' : '✗ DISABLED'}`);

// Check that FK constraints exist in schema
console.log('\n=== FOREIGN KEY CONSTRAINTS IN SCHEMA ===');
const sessionsTable = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='sessions'").get();
console.log('Sessions table has FK constraint:', sessionsTable?.sql?.includes('REFERENCES') ? '✓' : '✗');

const chaptersTable = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='chapters'").get();
console.log('Chapters table has FK constraint:', chaptersTable?.sql?.includes('REFERENCES') ? '✓' : '✗');

db.close();
console.log('\n=== SCHEMA VERIFICATION COMPLETE ===');
