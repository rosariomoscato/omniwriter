const Database = require('better-sqlite3');
const path = require('path');

console.log('Verifying database schema...\n');

try {
  const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
  const db = new Database(dbPath);

  // Get all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  console.log('Found tables:', tables.map(t => t.name));
  console.log(`Total tables: ${tables.length}\n`);

  // Required tables from spec
  const requiredTables = [
    'users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions',
    'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources',
    'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences'
  ];

  console.log('Checking required tables:');
  let missingTables = [];
  requiredTables.forEach(table => {
    const exists = tables.some(t => t.name === table);
    console.log(`  ${exists ? '✓' : '✗'} ${table}`);
    if (!exists) missingTables.push(table);
  });

  if (missingTables.length > 0) {
    console.log(`\n✗ Missing tables: ${missingTables.join(', ')}`);
    process.exit(1);
  }

  // Verify key columns on users table
  console.log('\nVerifying users table columns:');
  const usersColumns = db.prepare("PRAGMA table_info(users)").all();
  const userColNames = usersColumns.map(c => c.name);
  console.log('  Columns:', userColNames.join(', '));

  const requiredUserCols = ['id', 'email', 'password_hash', 'name', 'role', 'created_at', 'updated_at'];
  let missingUserCols = requiredUserCols.filter(col => !userColNames.includes(col));
  if (missingUserCols.length > 0) {
    console.log(`  ✗ Missing columns: ${missingUserCols.join(', ')}`);
  } else {
    console.log('  ✓ All required columns present');
  }

  // Verify key columns on projects table
  console.log('\nVerifying projects table columns:');
  const projectsColumns = db.prepare("PRAGMA table_info(projects)").all();
  const projectColNames = projectsColumns.map(c => c.name);
  console.log('  Columns:', projectColNames.join(', '));

  const requiredProjectCols = ['id', 'user_id', 'title', 'area', 'status', 'created_at', 'updated_at'];
  let missingProjectCols = requiredProjectCols.filter(col => !projectColNames.includes(col));
  if (missingProjectCols.length > 0) {
    console.log(`  ✗ Missing columns: ${missingProjectCols.join(', ')}`);
  } else {
    console.log('  ✓ All required columns present');
  }

  // Verify key columns on chapters table
  console.log('\nVerifying chapters table columns:');
  const chaptersColumns = db.prepare("PRAGMA table_info(chapters)").all();
  const chapterColNames = chaptersColumns.map(c => c.name);
  console.log('  Columns:', chapterColNames.join(', '));

  const requiredChapterCols = ['id', 'project_id', 'title', 'content', 'order_index', 'created_at', 'updated_at'];
  let missingChapterCols = requiredChapterCols.filter(col => !chapterColNames.includes(col));
  if (missingChapterCols.length > 0) {
    console.log(`  ✗ Missing columns: ${missingChapterCols.join(', ')}`);
  } else {
    console.log('  ✓ All required columns present');
  }

  // Check foreign keys
  console.log('\nChecking foreign key support:');
  const fkResult = db.prepare("PRAGMA foreign_keys").get();
  console.log(`  Foreign keys enabled: ${fkResult.foreign_keys === 1 ? '✓ Yes' : '✗ No'}`);

  db.close();

  if (missingTables.length === 0 && missingUserCols.length === 0 && missingProjectCols.length === 0 && missingChapterCols.length === 0) {
    console.log('\n✓ Database schema verification PASSED!');
    process.exit(0);
  } else {
    console.log('\n✗ Database schema verification FAILED!');
    process.exit(1);
  }
} catch (error) {
  console.error('✗ Error verifying schema:', error.message);
  process.exit(1);
}
