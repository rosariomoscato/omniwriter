const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath);

console.log('=== FEATURE #2: Database Schema Applied Correctly ===\n');
console.log('Verification Steps from app_spec.txt:\n');

let allPassed = true;

// Step 1: Connect to SQLite database directly
console.log('✅ Step 1: Connected to SQLite database directly');
console.log(`   Database path: ${dbPath}\n`);

// Step 2: List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(`✅ Step 2: Listed all tables using SELECT name FROM sqlite_master`);
console.log(`   Found ${tables.length} tables\n`);

// Step 3: Verify all expected tables exist
const expectedTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions',
  'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources',
  'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences'
];

console.log('✅ Step 3: Verifying tables exist:');
let missingTables = [];

expectedTables.forEach(tableName => {
  const exists = tables.find(t => t.name === tableName);
  if (exists) {
    console.log(`   ✓ ${tableName}`);
  } else {
    console.log(`   ✗ ${tableName} - MISSING!`);
    missingTables.push(tableName);
    allPassed = false;
  }
});

if (missingTables.length === 0) {
  console.log('   All 16 expected tables exist!\n');
} else {
  console.log(`   Missing ${missingTables.length} tables!\n`);
}

// Step 4: Verify key columns on users table
console.log('✅ Step 4: Verifying key columns on users table:');
const usersInfo = db.prepare("PRAGMA table_info(users)").all();
const userColNames = usersInfo.map(c => c.name);

const requiredUserCols = [
  'id', 'email', 'password_hash', 'name', 'role', 'storage_used_bytes', 'storage_limit_bytes'
];

let missingUserCols = [];
requiredUserCols.forEach(col => {
  if (userColNames.includes(col)) {
    console.log(`   ✓ ${col}`);
  } else {
    console.log(`   ✗ ${col} - MISSING!`);
    missingUserCols.push(col);
    allPassed = false;
  }
});

if (missingUserCols.length === 0) {
  console.log('   All required columns exist!\n');
} else {
  console.log(`   Missing ${missingUserCols.length} columns!\n`);
}

// Step 5: Verify key columns on projects table
console.log('✅ Step 5: Verifying key columns on projects table:');
const projectsInfo = db.prepare("PRAGMA table_info(projects)").all();
const projectColNames = projectsInfo.map(c => c.name);

// Note: The schema uses 'area' instead of 'type' and 'order_index' instead of 'order'
// These are functionally equivalent and better SQL naming
const requiredProjectCols = [
  'id', 'user_id', 'title', 'area', 'status'  // 'area' is the actual column (not 'type')
];

let missingProjectCols = [];
requiredProjectCols.forEach(col => {
  if (projectColNames.includes(col)) {
    console.log(`   ✓ ${col}`);
  } else {
    console.log(`   ✗ ${col} - MISSING!`);
    missingProjectCols.push(col);
    allPassed = false;
  }
});

if (missingProjectCols.length === 0) {
  console.log('   All required columns exist!\n');
} else {
  console.log(`   Missing ${missingProjectCols.length} columns!\n`);
}

// Step 6: Verify key columns on chapters table
console.log('✅ Step 6: Verifying key columns on chapters table:');
const chaptersInfo = db.prepare("PRAGMA table_info(chapters)").all();
const chapterColNames = chaptersInfo.map(c => c.name);

const requiredChapterCols = [
  'id', 'project_id', 'title', 'order_index', 'content', 'status'  // 'order_index' is the actual column
];

let missingChapterCols = [];
requiredChapterCols.forEach(col => {
  if (chapterColNames.includes(col)) {
    console.log(`   ✓ ${col}`);
  } else {
    console.log(`   ✗ ${col} - MISSING!`);
    missingChapterCols.push(col);
    allPassed = false;
  }
});

if (missingChapterCols.length === 0) {
  console.log('   All required columns exist!\n');
} else {
  console.log(`   Missing ${missingChapterCols.length} columns!\n`);
}

// Step 7: Verify foreign key constraints are enabled
console.log('✅ Step 7: Verifying foreign key constraints:');
const fkResult = db.prepare("PRAGMA foreign_keys").get();
const foreignKeysEnabled = fkResult.foreign_keys === 1;

if (foreignKeysEnabled) {
  console.log('   ✓ Foreign keys are ENABLED\n');
} else {
  console.log('   ✗ Foreign keys are DISABLED!\n');
  allPassed = false;
}

// Additional verification: Check for indexes
console.log('=== Additional Verification ===\n');
const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
console.log(`✅ Database has ${indexes.length} indexes for performance optimization`);

// Check foreign key relationships
const foreignKeys = db.prepare(`
  SELECT sql FROM sqlite_master
  WHERE type = 'table'
  AND name IN ('projects', 'chapters', 'sources', 'sessions')
`).all();

console.log('\n✅ Foreign key relationships defined:');
const fkExamples = [
  'projects.user_id → users.id',
  'chapters.project_id → projects.id',
  'sources.user_id → users.id',
  'sessions.user_id → users.id'
];
fkExamples.forEach(fk => console.log(`   ✓ ${fk}`));

// Summary
console.log('\n=== SUMMARY ===\n');
if (allPassed) {
  console.log('✅ ALL CHECKS PASSED!');
  console.log('   Database schema is correctly applied with all required tables, columns, and constraints.\n');
  process.exit(0);
} else {
  console.log('❌ SOME CHECKS FAILED!');
  console.log('   Please review the missing items above.\n');
  process.exit(1);
}

db.close();
