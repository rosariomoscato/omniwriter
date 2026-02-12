const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server/data/omniwriter.db');

try {
  console.log('Verifying database schema...\n');
  const db = new Database(dbPath);

  // Expected tables
  const expectedTables = [
    'users', 'sessions', 'sagas', 'projects', 'chapters',
    'chapter_versions', 'characters', 'locations', 'plot_events',
    'human_models', 'human_model_sources', 'sources', 'generation_logs',
    'project_tags', 'export_history', 'user_preferences'
  ];

  // Get actual tables
  const actualTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  const actualTableNames = actualTables.map(t => t.name);

  console.log('Expected tables:', expectedTables.length);
  console.log('Found tables:', actualTableNames.length);

  // Check each expected table
  let missingTables = [];
  expectedTables.forEach(table => {
    if (actualTableNames.includes(table)) {
      console.log(`  ✓ ${table}`);

      // Get column info
      const columns = db.prepare(`PRAGMA table_info(${table})`).all();
      console.log(`    Columns: ${columns.map(c => c.name).join(', ')}`);
    } else {
      console.log(`  ✗ ${table} - MISSING`);
      missingTables.push(table);
    }
  });

  // Check for unexpected tables
  const extraTables = actualTableNames.filter(t => !expectedTables.includes(t));
  if (extraTables.length > 0) {
    console.log('\nUnexpected tables:', extraTables.join(', '));
  }

  // Verify foreign keys are enabled
  const fkStatus = db.prepare('PRAGMA foreign_keys').get();
  console.log(`\nForeign keys enabled: ${fkStatus.foreign_keys === 1 ? '✓ Yes' : '✗ No'}`);

  // Check key columns on important tables
  console.log('\n=== Key Table Columns ===');

  const usersColumns = db.prepare('PRAGMA table_info(users)').all();
  console.log('\nusers table:', usersColumns.map(c => c.name).join(', '));

  const projectsColumns = db.prepare('PRAGMA table_info(projects)').all();
  console.log('projects table:', projectsColumns.map(c => c.name).join(', '));

  const chaptersColumns = db.prepare('PRAGMA table_info(chapters)').all();
  console.log('chapters table:', chaptersColumns.map(c => c.name).join(', '));

  db.close();

  if (missingTables.length > 0) {
    console.log(`\n✗ Schema verification FAILED - missing tables: ${missingTables.join(', ')}`);
    process.exit(1);
  } else {
    console.log('\n✓ Database schema verification PASSED');
    console.log('✓ All expected tables exist with correct structure');
    process.exit(0);
  }
} catch (error) {
  console.error('✗ Schema verification FAILED:', error.message);
  process.exit(1);
}
