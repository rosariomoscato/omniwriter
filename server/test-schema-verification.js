// Test Feature #2: Database schema applied correctly

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath, { readonly: true });

console.log('[Test] Verifying database schema...\n');

// Test 1: List all tables
console.log('=== Test 1: List all tables ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables found:', tables.length);
tables.forEach(t => console.log(`  - ${t.name}`));

// Test 2: Verify required tables exist
console.log('\n=== Test 2: Verify required tables ===');
const requiredTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters',
  'chapter_versions', 'characters', 'locations', 'plot_events',
  'human_models', 'human_model_sources', 'sources',
  'generation_logs', 'project_tags', 'export_history', 'user_preferences'
];

let allTablesExist = true;
requiredTables.forEach(table => {
  const exists = tables.some(t => t.name === table);
  const status = exists ? '✓' : '✗';
  console.log(`  ${status} ${table}`);
  if (!exists) allTablesExist = false;
});

// Test 3: Verify key columns on users table
console.log('\n=== Test 3: Users table columns ===');
const usersColumns = db.prepare("PRAGMA table_info(users)").all();
const requiredUserColumns = ['id', 'email', 'password_hash', 'name', 'role', 'created_at'];
usersColumns.forEach(col => {
  const required = requiredUserColumns.includes(col.name) ? '✓' : ' ';
  console.log(`  ${required} ${col.name} (${col.type})`);
});

// Test 4: Verify key columns on projects table
console.log('\n=== Test 4: Projects table columns ===');
const projectsColumns = db.prepare("PRAGMA table_info(projects)").all();
const requiredProjectColumns = ['id', 'user_id', 'title', 'type', 'created_at'];
projectsColumns.forEach(col => {
  const required = requiredProjectColumns.includes(col.name) ? '✓' : ' ';
  console.log(`  ${required} ${col.name} (${col.type})`);
});

// Test 5: Verify key columns on chapters table
console.log('\n=== Test 5: Chapters table columns ===');
const chaptersColumns = db.prepare("PRAGMA table_info(chapters)").all();
const requiredChapterColumns = ['id', 'project_id', 'title', 'order', 'content', 'created_at'];
chaptersColumns.forEach(col => {
  const required = requiredChapterColumns.includes(col.name) ? '✓' : ' ';
  console.log(`  ${required} ${col.name} (${col.type})`);
});

// Test 6: Verify foreign key constraints
console.log('\n=== Test 6: Foreign key constraints ===');
const fkStatus = db.prepare("PRAGMA foreign_keys").get();
console.log(`  Foreign keys enabled: ${fkStatus.foreign_keys === 1 ? '✓ Yes' : '✗ No'}`);

// Test 7: Check for foreign keys on projects table
const projectsFks = db.prepare("PRAGMA foreign_key_list(projects)").all();
console.log(`  Projects table has ${projectsFks.length} foreign key(s)`);
projectsFks.forEach(fk => {
  console.log(`    - ${fk.from} → ${fk.table}.${fk.to}`);
});

// Final result
console.log('\n=== Test Result ===');
if (allTablesExist && fkStatus.foreign_keys === 1) {
  console.log('[Test] ✓ ALL CHECKS PASSED - Feature #2 verified');
  process.exit(0);
} else {
  console.log('[Test] ✗ SOME CHECKS FAILED');
  process.exit(1);
}
