var Database = require('./server/node_modules/better-sqlite3');
var db = new Database('./server/data/omniwriter.db');

console.log('=== Feature 2: Database Schema Verification ===\n');

// List all tables
var tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables found (' + tables.length + '):', tables.map(function(t){return t.name}).join(', '));

var requiredTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters',
  'chapter_versions', 'characters', 'locations', 'plot_events',
  'human_models', 'human_model_sources', 'sources', 'generation_logs',
  'project_tags', 'export_history', 'user_preferences'
];

console.log('\n=== Checking required tables ===');
var allTablesExist = true;
for (var i = 0; i < requiredTables.length; i++) {
  var table = requiredTables[i];
  var exists = tables.some(function(t) { return t.name === table; });
  console.log(table + ': ' + (exists ? '✓' : '✗ MISSING'));
  if (!exists) allTablesExist = false;
}

// Check users table columns
console.log('\n=== Users table columns ===');
var usersCols = db.prepare('PRAGMA table_info(users)').all();
console.log(usersCols.map(function(c) { return c.name; }).join(', '));

// Check projects table columns
console.log('\n=== Projects table columns ===');
var projectsCols = db.prepare('PRAGMA table_info(projects)').all();
console.log(projectsCols.map(function(c) { return c.name; }).join(', '));

// Check chapters table columns
console.log('\n=== Chapters table columns ===');
var chaptersCols = db.prepare('PRAGMA table_info(chapters)').all();
console.log(chaptersCols.map(function(c) { return c.name; }).join(', '));

// Check foreign keys
console.log('\n=== Foreign key status ===');
var fkStatus = db.prepare('PRAGMA foreign_keys').get();
console.log('Foreign keys enabled:', fkStatus ? 'Yes' : 'No');

console.log('\n=== Result ===');
console.log('All required tables exist:', allTablesExist);

db.close();
