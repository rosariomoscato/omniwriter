const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3/lib/database.js');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db', { readonly: true });

console.log('=== Testing Infrastructure Features ===\n');

// Feature 1: Check database connection
console.log('Feature 1: Database connection');
console.log('✓ Database connection established');

// Feature 2: Check schema
console.log('\nFeature 2: Database schema');
const tables = db.prepare('SELECT name FROM sqlite_master WHERE type="table" ORDER BY name').all();
const tableNames = tables.map(t => t.name);
console.log('Tables found:', tableNames.length);

const requiredTables = ['users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions', 'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources', 'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences'];
const missing = requiredTables.filter(t => !tableNames.includes(t));
if (missing.length === 0) {
  console.log('✓ All required tables exist');
} else {
  console.log('✗ Missing tables:', missing);
}

// Check key columns
console.log('\nChecking key columns...');
const usersColumns = db.prepare('PRAGMA table_info(users)').all();
console.log('Users table columns:', usersColumns.length, 'columns');

const projectsColumns = db.prepare('PRAGMA table_info(projects)').all();
console.log('Projects table columns:', projectsColumns.length, 'columns');

const chaptersColumns = db.prepare('PRAGMA table_info(chapters)').all();
console.log('Chapters table columns:', chaptersColumns.length, 'columns');

// Feature 3: Check persistence by checking if user data exists
console.log('\nFeature 3: Data persistence');
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
console.log('User count:', userCount.count);

if (userCount.count > 0) {
  const sampleUser = db.prepare('SELECT id, email, created_at FROM users LIMIT 1').get();
  console.log('Sample user:', sampleUser);
  console.log('✓ Data exists in database');
} else {
  console.log('✗ No data in database');
}

db.close();
console.log('\n=== Infrastructure Test Complete ===');
