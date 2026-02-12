// Test script to verify database schema (Feature 2)
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath);

// Enable foreign keys for this connection
db.pragma('foreign_keys = ON');

// Verify they are enabled
const fkResult = db.pragma('foreign_keys');
const fkEnabled = fkResult[0]?.foreign_keys;

console.log('[Feature 2] Verifying database schema...\n');

// Expected tables
const expectedTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters',
  'chapter_versions', 'characters', 'locations', 'plot_events',
  'human_models', 'human_model_sources', 'sources', 'generation_logs',
  'project_tags', 'export_history', 'user_preferences', 'citations'
];

let allTablesExist = true;

// Check all expected tables exist
console.log('[Feature 2] Checking tables...');
const tables = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
).all();

const tableNames = tables.map(t => t.name);
console.log('[Feature 2] Found tables:', tableNames.join(', '));

expectedTables.forEach(tableName => {
  if (tableNames.includes(tableName)) {
    console.log(`[Feature 2] ✅ Table '${tableName}' exists`);
  } else {
    console.log(`[Feature 2] ❌ Table '${tableName}' is missing`);
    allTablesExist = false;
  }
});

// Verify foreign keys are enabled
console.log(`\n[Feature 2] Foreign keys: ${fkEnabled === 1 ? 'enabled ✅' : 'disabled ❌'}`);

// Verify key columns on users table
console.log('\n[Feature 2] Verifying users table columns...');
const usersTableInfo = db.pragma(`table_info(users)`);
const usersColumns = usersTableInfo.map(col => col.name);
const expectedUserColumns = ['id', 'email', 'password_hash', 'name', 'role', 'preferred_language', 'theme_preference', 'google_id'];

expectedUserColumns.forEach(col => {
  if (usersColumns.includes(col)) {
    console.log(`[Feature 2] ✅ users.${col} exists`);
  } else {
    console.log(`[Feature 2] ❌ users.${col} is missing`);
    allTablesExist = false;
  }
});

// Verify key columns on projects table
console.log('\n[Feature 2] Verifying projects table columns...');
const projectsTableInfo = db.pragma(`table_info(projects)`);
const projectsColumns = projectsTableInfo.map(col => col.name);
const expectedProjectColumns = ['id', 'user_id', 'saga_id', 'title', 'area', 'status'];

expectedProjectColumns.forEach(col => {
  if (projectsColumns.includes(col)) {
    console.log(`[Feature 2] ✅ projects.${col} exists`);
  } else {
    console.log(`[Feature 2] ❌ projects.${col} is missing`);
    allTablesExist = false;
  }
});

// Verify key columns on chapters table
console.log('\n[Feature 2] Verifying chapters table columns...');
const chaptersTableInfo = db.pragma(`table_info(chapters)`);
const chaptersColumns = chaptersTableInfo.map(col => col.name);
const expectedChapterColumns = ['id', 'project_id', 'title', 'content', 'order_index', 'status'];

expectedChapterColumns.forEach(col => {
  if (chaptersColumns.includes(col)) {
    console.log(`[Feature 2] ✅ chapters.${col} exists`);
  } else {
    console.log(`[Feature 2] ❌ chapters.${col} is missing`);
    allTablesExist = false;
  }
});

db.close();

if (allTablesExist && fkEnabled === 1) {
  console.log('\n[Feature 2] ✅ All schema verifications passed!');
  process.exit(0);
} else {
  console.log('\n[Feature 2] ❌ Some schema verifications failed');
  process.exit(1);
}
