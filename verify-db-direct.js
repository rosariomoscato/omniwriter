const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const path = require('path');

const dbPath = '/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db';
const db = new Database(dbPath);

console.log('=== Database Verification ===\n');

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables found:', tables.map(t => t.name));
console.log('Total tables:', tables.length);

// Expected tables from spec
const expectedTables = [
  'users', 'sessions', 'sagas', 'projects', 'chapters', 'chapter_versions',
  'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources',
  'sources', 'generation_logs', 'project_tags', 'citations', 'export_history',
  'user_preferences'
];

console.log('\nExpected tables:', expectedTables.length);
console.log('Missing tables:', expectedTables.filter(t => !tables.find(tbl => tbl.name === t)));

// Check users table columns
console.log('\n=== Users table columns ===');
const usersColumns = db.prepare("PRAGMA table_info(users)").all();
console.log('Columns:', usersColumns.map(c => ({name: c.name, type: c.type})));

// Check projects table columns
console.log('\n=== Projects table columns ===');
const projectsColumns = db.prepare("PRAGMA table_info(projects)").all();
console.log('Columns:', projectsColumns.map(c => ({name: c.name, type: c.type})));

// Check chapters table columns
console.log('\n=== Chapters table columns ===');
const chaptersColumns = db.prepare("PRAGMA table_info(chapters)").all();
console.log('Columns:', chaptersColumns.map(c => ({name: c.name, type: c.type})));

// Check foreign keys are enabled
console.log('\n=== Foreign Keys ===');
const fkStatus = db.prepare("PRAGMA foreign_keys").get();
console.log('Foreign keys enabled:', fkStatus.foreign_keys === 1);

db.close();
console.log('\n=== Verification Complete ===');
