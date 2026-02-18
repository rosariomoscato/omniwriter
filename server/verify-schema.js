const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath);

try {
  // List all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  console.log('=== TABLES IN DATABASE ===');
  tables.forEach(t => console.log(`  - ${t.name}`));
  console.log(`Total tables: ${tables.length}\n`);

  // Expected tables from spec
  const expectedTables = [
    'users', 'sessions', 'password_reset_tokens', 'sagas', 'projects',
    'chapters', 'chapter_versions', 'characters', 'locations', 'plot_events',
    'human_models', 'human_model_sources', 'sources', 'generation_logs',
    'project_tags', 'citations', 'export_history', 'llm_providers',
    'user_preferences', 'chapter_comments'
  ];

  const missingTables = expectedTables.filter(t => !tables.find(tbl => tbl.name === t));
  const extraTables = tables.filter(tbl => !expectedTables.includes(tbl.name));

  if (missingTables.length > 0) {
    console.log('❌ MISSING TABLES:', missingTables.join(', '));
  } else {
    console.log('✅ All expected tables exist\n');
  }

  if (extraTables.length > 0) {
    console.log('⚠️  EXTRA TABLES:', extraTables.map(t => t.name).join(', '));
  }

  // Check key columns on users table
  console.log('\n=== USERS TABLE COLUMNS ===');
  const usersColumns = db.prepare('PRAGMA table_info(users)').all();
  const expectedUserColumns = ['id', 'email', 'password_hash', 'name', 'role', 'google_id', 'created_at'];
  usersColumns.forEach(col => console.log(`  - ${col.name} (${col.type})`));

  const missingUserCols = expectedUserColumns.filter(col => !usersColumns.find(c => c.name === col));
  if (missingUserCols.length > 0) {
    console.log(`❌ MISSING USER COLUMNS: ${missingUserCols.join(', ')}`);
  } else {
    console.log('✅ All key user columns exist\n');
  }

  // Check foreign keys
  console.log('\n=== FOREIGN KEY CHECK ===');
  const fkEnabled = db.prepare('PRAGMA foreign_keys').get();
  console.log(`Foreign keys enabled: ${fkEnabled.foreign_keys === 1 ? '✅ YES' : '❌ NO'}`);

  // Check projects table
  console.log('\n=== PROJECTS TABLE COLUMNS ===');
  const projectsColumns = db.prepare('PRAGMA table_info(projects)').all();
  projectsColumns.forEach(col => console.log(`  - ${col.name} (${col.type})`));

  // Check chapters table
  console.log('\n=== CHAPTERS TABLE COLUMNS ===');
  const chaptersColumns = db.prepare('PRAGMA table_info(chapters)').all();
  chaptersColumns.forEach(col => console.log(`  - ${col.name} (${col.type})`));

} finally {
  db.close();
}
