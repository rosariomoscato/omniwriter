import Database from 'better-sqlite3';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, 'data/omniwriter.db');
const db = new Database(dbPath, { readonly: true });

console.log('='.repeat(60));
console.log('VERIFICATION: Features #1 and #2 (Infrastructure)');
console.log('='.repeat(60));

// Feature #1: Database connection established
console.log('\n[Feature #1] Database Connection Established');
console.log('-'.repeat(60));
try {
  const result = db.prepare("SELECT 1 AS test").get();
  if (result && result.test === 1) {
    console.log('✅ PASS: Database connection successful');
    console.log(`   Database path: ${dbPath}`);
  } else {
    console.log('❌ FAIL: Database query returned unexpected result');
  }
} catch (error) {
  console.log(`❌ FAIL: Database connection failed - ${error.message}`);
}

// Feature #2: Database schema applied correctly
console.log('\n[Feature #2] Database Schema Applied Correctly');
console.log('-'.repeat(60));

const expectedTables = [
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

try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  const tableNames = tables.map(t => t.name);

  console.log(`Found ${tableNames.length} tables in database:`);
  tableNames.forEach(name => console.log(`  - ${name}`));

  console.log('\nVerifying expected tables from app_spec.txt:');
  let allTablesExist = true;
  let missingTables = [];

  expectedTables.forEach(tableName => {
    const exists = tableNames.includes(tableName);
    const status = exists ? '✅' : '❌';
    console.log(`  ${status} ${tableName}`);
    if (!exists) {
      allTablesExist = false;
      missingTables.push(tableName);
    }
  });

  if (allTablesExist) {
    console.log('\n✅ PASS: All expected tables exist');
  } else {
    console.log(`\n❌ FAIL: Missing tables: ${missingTables.join(', ')}`);
  }

  // Verify key columns on users table
  console.log('\nVerifying users table columns:');
  const usersColumns = db.prepare("PRAGMA table_info(users)").all();
  const usersColNames = usersColumns.map(c => c.name);
  console.log(`  Columns: ${usersColNames.join(', ')}`);

  const requiredUserCols = ['id', 'email', 'password_hash', 'name', 'role', 'created_at'];
  const missingUserCols = requiredUserCols.filter(c => !usersColNames.includes(c));
  if (missingUserCols.length === 0) {
    console.log('  ✅ All required columns present');
  } else {
    console.log(`  ❌ Missing columns: ${missingUserCols.join(', ')}`);
  }

  // Verify foreign keys are enabled
  console.log('\nVerifying foreign key constraints:');
  const fkStatus = db.prepare("PRAGMA foreign_keys").get();
  console.log(`  Foreign keys enabled: ${fkStatus.foreign_keys === 1 ? '✅ Yes' : '❌ No'}`);

} catch (error) {
  console.log(`❌ FAIL: Schema verification failed - ${error.message}`);
}

// Check database size and stats
console.log('\nDatabase Statistics:');
console.log('-'.repeat(60));
try {
  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users) as users,
      (SELECT COUNT(*) FROM sessions) as sessions,
      (SELECT COUNT(*) FROM projects) as projects,
      (SELECT COUNT(*) FROM chapters) as chapters
  `).get();
  console.log(`  Users: ${stats.users}`);
  console.log(`  Sessions: ${stats.sessions}`);
  console.log(`  Projects: ${stats.projects}`);
  console.log(`  Chapters: ${stats.chapters}`);
} catch (error) {
  console.log(`  Error getting stats: ${error.message}`);
}

console.log('\n' + '='.repeat(60));
console.log('VERIFICATION COMPLETE');
console.log('='.repeat(60));

db.close();
