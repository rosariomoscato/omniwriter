const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server/data/omniwriter.db');
console.log('Connecting to database:', dbPath);

const db = new Database(dbPath);

// Check if foreign keys are enabled
const fkResult = db.prepare('PRAGMA foreign_keys').get();
console.log('\n✓ Foreign keys enabled:', fkResult.foreign_keys === 1 ? 'YES' : 'NO');

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
console.log('\n✓ Tables found:', tables.length);
tables.forEach(t => console.log('  -', t.name));

// Expected tables from spec
const expectedTables = [
  'users', 'sessions', 'password_reset_tokens', 'sagas', 'projects',
  'chapters', 'chapter_versions', 'characters', 'locations', 'plot_events',
  'human_models', 'human_model_sources', 'sources', 'generation_logs',
  'project_tags', 'citations', 'export_history', 'user_preferences', 'chapter_comments'
];

console.log('\n--- Checking expected tables ---');
let missingTables = [];
expectedTables.forEach(table => {
  const exists = tables.some(t => t.name === table);
  console.log(`${exists ? '✓' : '✗'} ${table}`);
  if (!exists) missingTables.push(table);
});

// Check key columns on users table
console.log('\n--- Checking users table columns ---');
const usersColumns = db.prepare('PRAGMA table_info(users)').all();
console.log('Users table columns:', usersColumns.length);
const userColNames = usersColumns.map(c => c.name);
const requiredUserCols = ['id', 'email', 'password_hash', 'name', 'role', 'preferred_language', 'theme_preference'];
requiredUserCols.forEach(col => {
  console.log(`${userColNames.includes(col) ? '✓' : '✗'} ${col}`);
});

// Check key columns on projects table
console.log('\n--- Checking projects table columns ---');
const projectsColumns = db.prepare('PRAGMA table_info(projects)').all();
console.log('Projects table columns:', projectsColumns.length);
const projectColNames = projectsColumns.map(c => c.name);
const requiredProjectCols = ['id', 'user_id', 'saga_id', 'title', 'area', 'status', 'word_count'];
requiredProjectCols.forEach(col => {
  console.log(`${projectColNames.includes(col) ? '✓' : '✗'} ${col}`);
});

// Check key columns on chapters table
console.log('\n--- Checking chapters table columns ---');
const chaptersColumns = db.prepare('PRAGMA table_info(chapters)').all();
console.log('Chapters table columns:', chaptersColumns.length);
const chapterColNames = chaptersColumns.map(c => c.name);
const requiredChapterCols = ['id', 'project_id', 'title', 'content', 'order_index', 'status', 'word_count'];
requiredChapterCols.forEach(col => {
  console.log(`${chapterColNames.includes(col) ? '✓' : '✗'} ${col}`);
});

// Summary
console.log('\n=== SUMMARY ===');
if (missingTables.length === 0) {
  console.log('✓ All expected tables exist');
} else {
  console.log('✗ Missing tables:', missingTables.join(', '));
}

db.close();
