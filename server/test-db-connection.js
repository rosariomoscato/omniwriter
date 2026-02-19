const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
console.log('[Test] Connecting to database at:', dbPath);

try {
  const db = new Database(dbPath, { readonly: true });

  // Test 1: List all tables
  console.log('\n[Test] Listing all tables:');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('Tables found:', tables.map(t => t.name));

  // Test 2: Check if key tables exist (from Feature #2)
  const requiredTables = [
    'users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions',
    'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources',
    'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences',
    'password_reset_tokens', 'citations', 'llm_providers', 'chapter_comments'
  ];
  console.log('\n[Test] Verifying required tables (Feature #2):');
  let allTablesExist = true;
  requiredTables.forEach(table => {
    const exists = tables.some(t => t.name === table);
    console.log(`  ${table}: ${exists ? '✓' : '✗'}`);
    if (!exists) allTablesExist = false;
  });

  if (!allTablesExist) {
    throw new Error('Some required tables are missing!');
  }

  // Test 3: Check users table structure (Feature #2 requirement)
  console.log('\n[Test] Users table key columns:');
  const usersInfo = db.prepare("PRAGMA table_info(users)").all();
  const userColumnNames = usersInfo.map(col => col.name);
  const requiredUserColumns = ['id', 'email', 'password_hash', 'name', 'role', 'google_id'];
  requiredUserColumns.forEach(col => {
    const exists = userColumnNames.includes(col);
    console.log(`  - ${col}: ${exists ? '✓' : '✗'}`);
  });

  // Test 3b: Check projects table structure (Feature #2 requirement)
  console.log('\n[Test] Projects table key columns:');
  const projectsInfo = db.prepare("PRAGMA table_info(projects)").all();
  const projectColumnNames = projectsInfo.map(col => col.name);
  const requiredProjectColumns = ['id', 'user_id', 'saga_id', 'title', 'area', 'status', 'human_model_id'];
  requiredProjectColumns.forEach(col => {
    const exists = projectColumnNames.includes(col);
    console.log(`  - ${col}: ${exists ? '✓' : '✗'}`);
  });

  // Test 3c: Check chapters table structure (Feature #2 requirement)
  console.log('\n[Test] Chapters table key columns:');
  const chaptersInfo = db.prepare("PRAGMA table_info(chapters)").all();
  const chapterColumnNames = chaptersInfo.map(col => col.name);
  const requiredChapterColumns = ['id', 'project_id', 'title', 'content', 'order_index', 'status'];
  requiredChapterColumns.forEach(col => {
    const exists = chapterColumnNames.includes(col);
    console.log(`  - ${col}: ${exists ? '✓' : '✗'}`);
  });

  // Test 4: Check if foreign keys are enabled
  const fkStatus = db.prepare("PRAGMA foreign_keys").get();
  console.log('\n[Test] Foreign keys enabled:', fkStatus.foreign_keys === 1 ? 'Yes' : 'No');

  // Test 5: Count rows in key tables
  console.log('\n[Test] Row counts:');
  requiredTables.slice(0, 5).forEach(table => {
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      console.log(`  ${table}: ${count.count} rows`);
    } catch (e) {
      console.log(`  ${table}: Error - ${e.message}`);
    }
  });

  db.close();
  console.log('\n[Test] ✓ Database connection test PASSED');
  process.exit(0);
} catch (error) {
  console.error('\n[Test] ✗ Database connection test FAILED:', error.message);
  process.exit(1);
}
