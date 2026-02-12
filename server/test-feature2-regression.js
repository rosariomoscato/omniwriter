// Test script for Feature 2: Database Schema Regression Test
const Database = require('better-sqlite3');
const path = require('path');

console.log('[Test] Testing Feature 2: Database schema applied correctly\n');

try {
  const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
  const db = new Database(dbPath, { readonly: true });

  // Required tables from app_spec.txt
  const requiredTables = [
    'users',
    'sessions',
    'projects',
    'sagas',
    'chapters',
    'chapter_versions',
    'characters',
    'locations',
    'plot_events',
    'human_models',
    'human_model_sources',
    'sources',
    'generation_logs',
    'project_tags',
    'export_history',
    'user_preferences'
  ];

  // Test 1: Check all required tables exist
  console.log('[Test 1] Verifying all required tables exist...');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  const tableNames = tables.map(t => t.name);

  const missingTables = requiredTables.filter(t => !tableNames.includes(t));
  if (missingTables.length > 0) {
    console.log(`[Test 1] ✗ Missing tables: ${missingTables.join(', ')}`);
    process.exit(1);
  }
  console.log(`[Test 1] ✓ All ${requiredTables.length} required tables exist`);

  // Test 2: Verify key columns on users table
  console.log('[Test 2] Verifying users table columns...');
  const usersColumns = db.prepare("PRAGMA table_info(users)").all();
  const usersColNames = usersColumns.map(c => c.name);

  const requiredUserCols = ['id', 'email', 'password_hash', 'name', 'role', 'created_at', 'updated_at'];
  const missingUserCols = requiredUserCols.filter(c => !usersColNames.includes(c));

  if (missingUserCols.length > 0) {
    console.log(`[Test 2] ✗ Missing columns in users table: ${missingUserCols.join(', ')}`);
    process.exit(1);
  }
  console.log('[Test 2] ✓ Users table has all required columns');

  // Test 3: Verify key columns on projects table
  console.log('[Test 3] Verifying projects table columns...');
  const projectsColumns = db.prepare("PRAGMA table_info(projects)").all();
  const projectsColNames = projectsColumns.map(c => c.name);

  const requiredProjectCols = ['id', 'user_id', 'title', 'area', 'created_at', 'updated_at'];
  const missingProjectCols = requiredProjectCols.filter(c => !projectsColNames.includes(c));

  if (missingProjectCols.length > 0) {
    console.log(`[Test 3] ✗ Missing columns in projects table: ${missingProjectCols.join(', ')}`);
    process.exit(1);
  }
  console.log('[Test 3] ✓ Projects table has all required columns');

  // Test 4: Verify key columns on chapters table
  console.log('[Test 4] Verifying chapters table columns...');
  const chaptersColumns = db.prepare("PRAGMA table_info(chapters)").all();
  const chaptersColNames = chaptersColumns.map(c => c.name);

  const requiredChapterCols = ['id', 'project_id', 'title', 'content', 'order_index', 'created_at', 'updated_at'];
  const missingChapterCols = requiredChapterCols.filter(c => !chaptersColNames.includes(c));

  if (missingChapterCols.length > 0) {
    console.log(`[Test 4] ✗ Missing columns in chapters table: ${missingChapterCols.join(', ')}`);
    process.exit(1);
  }
  console.log('[Test 4] ✓ Chapters table has all required columns');

  // Test 5: Verify foreign keys are enabled
  console.log('[Test 5] Verifying foreign key constraints...');
  const fkResult = db.prepare("PRAGMA foreign_keys").get();
  if (fkResult.foreign_keys === 0) {
    console.log('[Test 5] ✗ Foreign keys are NOT enabled');
    process.exit(1);
  }
  console.log('[Test 5] ✓ Foreign key constraints are enabled');

  // Test 6: List all tables found
  console.log('\n[Test 6] All tables in database:');
  tableNames.forEach(t => console.log(`  - ${t}`));

  db.close();

  console.log('\n[Summary] All Feature 2 verification steps PASSED ✓');
  console.log(`- All ${requiredTables.length} required tables exist`);
  console.log('- Users table has correct columns');
  console.log('- Projects table has correct columns');
  console.log('- Chapters table has correct columns');
  console.log('- Foreign key constraints enabled');
  process.exit(0);

} catch (error) {
  console.error('[Error] Schema verification failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
