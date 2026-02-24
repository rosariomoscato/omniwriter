const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data', 'omniwriter.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('=== DATABASE SCHEMA VERIFICATION ===\n');

// List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables found (' + tables.length + '):');
tables.forEach(t => console.log('  - ' + t.name));

// Expected tables
const expectedTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters',
  'chapter_versions', 'characters', 'locations', 'plot_events',
  'human_models', 'human_model_sources', 'sources', 'generation_logs',
  'project_tags', 'export_history', 'user_preferences'
];

console.log('\n=== VERIFYING EXPECTED TABLES ===');
let allFound = true;
expectedTables.forEach(table => {
  const found = tables.some(t => t.name === table);
  console.log('  ' + (found ? '✓' : '✗') + ' ' + table);
  if (!found) allFound = false;
});

// Verify key columns on users table
console.log('\n=== USERS TABLE COLUMNS ===');
const usersCols = db.prepare("PRAGMA table_info(users)").all();
usersCols.forEach(col => console.log('  - ' + col.name + ' (' + col.type + ')'));

// Verify key columns on projects table
console.log('\n=== PROJECTS TABLE COLUMNS ===');
const projectsCols = db.prepare("PRAGMA table_info(projects)").all();
projectsCols.forEach(col => console.log('  - ' + col.name + ' (' + col.type + ')'));

// Verify key columns on chapters table
console.log('\n=== CHAPTERS TABLE COLUMNS ===');
const chaptersCols = db.prepare("PRAGMA table_info(chapters)").all();
chaptersCols.forEach(col => console.log('  - ' + col.name + ' (' + col.type + ')'));

// Verify foreign key constraints
console.log('\n=== FOREIGN KEYS STATUS ===');
const fkStatus = db.prepare("PRAGMA foreign_keys").get();
console.log('  Foreign keys enabled: ' + (fkStatus.foreign_keys === 1 ? 'YES' : 'NO'));

console.log('\n=== RESULT ===');
if (allFound && fkStatus.foreign_keys === 1) {
  console.log('✓ SCHEMA VERIFICATION PASSED');
} else {
  console.log('✗ SCHEMA VERIFICATION FAILED');
}

db.close();
