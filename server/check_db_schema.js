const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');

const dbPath = '/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db';
const db = new Database(dbPath);

const expectedTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions',
  'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources',
  'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences',
  'citations', 'password_reset_tokens', 'chapter_comments'
];

console.log('Checking database schema...\n');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
const tableNames = tables.map(t => t.name).sort();

console.log('Found tables:', tableNames.join(', '));
console.log('Expected tables:', expectedTables.sort().join(', '));

const missing = expectedTables.filter(t => !tableNames.includes(t));
const extra = tableNames.filter(t => !expectedTables.includes(t));

let passed = true;

if (missing.length > 0) {
  console.log('\n❌ Missing tables:', missing);
  passed = false;
} else {
  console.log('\n✅ All expected tables exist');
}

if (extra.length > 0) {
  console.log('⚠️  Extra tables:', extra);
}

// Check key columns
console.log('\n--- Checking key columns ---');

const usersCols = db.prepare("PRAGMA table_info(users)").all();
const usersColNames = usersCols.map(c => c.name);
console.log('users table columns:', usersColNames.join(', '));
const usersRequired = ['id', 'email', 'password_hash', 'name', 'role', 'created_at'];
const usersMissing = usersRequired.filter(r => !usersColNames.includes(r));
if (usersMissing.length > 0) {
  console.log('❌ users missing columns:', usersMissing);
  passed = false;
} else {
  console.log('✅ users table has required columns');
}

const projectsCols = db.prepare("PRAGMA table_info(projects)").all();
const projectsColNames = projectsCols.map(c => c.name);
console.log('projects table columns:', projectsColNames.join(', '));
const projectsRequired = ['id', 'title', 'description', 'user_id', 'created_at'];
const projectsMissing = projectsRequired.filter(r => !projectsColNames.includes(r));
if (projectsMissing.length > 0) {
  console.log('❌ projects missing columns:', projectsMissing);
  passed = false;
} else {
  console.log('✅ projects table has required columns');
}

const chaptersCols = db.prepare("PRAGMA table_info(chapters)").all();
const chaptersColNames = chaptersCols.map(c => c.name);
console.log('chapters table columns:', chaptersColNames.join(', '));
const chaptersRequired = ['id', 'title', 'content', 'project_id', 'order_index', 'created_at'];
const chaptersMissing = chaptersRequired.filter(r => !chaptersColNames.includes(r));
if (chaptersMissing.length > 0) {
  console.log('❌ chapters missing columns:', chaptersMissing);
  passed = false;
} else {
  console.log('✅ chapters table has required columns');
}

// Check foreign keys
const fkResult = db.prepare("PRAGMA foreign_keys").get();
console.log('\nForeign keys enabled:', fkResult.foreign_keys === 1 ? '✅ Yes' : '❌ No');

db.close();

if (passed) {
  console.log('\n✅ Feature 2: PASSED - Database schema applied correctly');
  process.exit(0);
} else {
  console.log('\n❌ Feature 2: FAILED - Database schema issues detected');
  process.exit(1);
}
