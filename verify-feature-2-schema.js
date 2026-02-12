#!/usr/bin/env node
// Feature 2: Database Schema Applied Correctly
const path = require('path');

// Load better-sqlite3 from server/node_modules
const Database = require(path.join(__dirname, 'server', 'node_modules', 'better-sqlite3'));

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('\n=== Tables in database ===');
tables.forEach(t => console.log('  -', t.name));

// Expected tables from spec
const expectedTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions',
  'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources',
  'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences'
];

console.log('\n=== Expected vs Actual ===');
const actualTableNames = tables.map(t => t.name);
let missing = [];
expectedTables.forEach(expected => {
  const exists = actualTableNames.includes(expected);
  console.log(`${exists ? '✓' : '✗'} ${expected}`);
  if (!exists) missing.push(expected);
});

// Verify key columns on users table
console.log('\n=== Users table columns ===');
const usersColumns = db.prepare("PRAGMA table_info(users)").all();
usersColumns.forEach(col => {
  console.log(`  - ${col.name} (${col.type})`);
});

// Verify key columns on projects table
console.log('\n=== Projects table columns ===');
const projectsColumns = db.prepare("PRAGMA table_info(projects)").all();
projectsColumns.forEach(col => {
  console.log(`  - ${col.name} (${col.type})`);
});

// Verify key columns on chapters table
console.log('\n=== Chapters table columns ===');
const chaptersColumns = db.prepare("PRAGMA table_info(chapters)").all();
chaptersColumns.forEach(col => {
  console.log(`  - ${col.name} (${col.type})`);
});

// Check foreign keys
console.log('\n=== Foreign Keys Status ===');
const fkStatus = db.prepare("PRAGMA foreign_keys").get();
console.log('Foreign keys enabled:', fkStatus.foreign_keys === 1 ? 'Yes ✓' : 'No ✗');

db.close();

if (missing.length > 0) {
  console.log('\n❌ FAILURE: Missing tables:', missing.join(', '));
  process.exit(1);
} else {
  console.log('\n✅ SUCCESS: All expected tables exist with correct schema');
  process.exit(0);
}
