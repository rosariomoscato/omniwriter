// Feature 2 Verification: Database schema applied correctly
const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

console.log('=== Feature 2: Database Schema Verification ===\n');

// Step 1: List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables found (' + tables.length + '):');
tables.forEach(t => console.log('  - ' + t.name));

// Step 2: Verify required tables exist
const requiredTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions',
  'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources',
  'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences'
];

console.log('\n=== Required Tables Check ===');
let missingTables = [];
for (const table of requiredTables) {
  const found = tables.some(t => t.name === table);
  if (found) {
    console.log('✓ ' + table);
  } else {
    console.log('✗ ' + table + ' - MISSING');
    missingTables.push(table);
  }
}

// Step 3: Verify key columns on users table
console.log('\n=== Users Table Columns ===');
const usersSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
if (usersSchema) {
  console.log(usersSchema.sql);
} else {
  console.log('ERROR: users table not found');
}

// Step 4: Verify key columns on projects table
console.log('\n=== Projects Table Columns ===');
const projectsSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
if (projectsSchema) {
  console.log(projectsSchema.sql);
} else {
  console.log('ERROR: projects table not found');
}

// Step 5: Verify key columns on chapters table
console.log('\n=== Chapters Table Columns ===');
const chaptersSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='chapters'").get();
if (chaptersSchema) {
  console.log(chaptersSchema.sql);
} else {
  console.log('ERROR: chapters table not found');
}

// Step 6: Verify foreign key constraints are enabled
console.log('\n=== Foreign Keys Check ===');
const fkStatus = db.prepare('PRAGMA foreign_keys').get();
console.log('Foreign keys enabled:', fkStatus.foreign_keys === 1 ? 'YES' : 'NO');

// Summary
console.log('\n=== SUMMARY ===');
if (missingTables.length === 0) {
  console.log('✓ All required tables exist');
} else {
  console.log('✗ Missing tables:', missingTables.join(', '));
}

db.close();
