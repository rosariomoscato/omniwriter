const Database = require('better-sqlite3');
const db = new Database('server/data/omniwriter.db');

// Get all tables
const tables = db.prepare('SELECT name FROM sqlite_master WHERE type="table" ORDER BY name').all();
console.log('Tables found:', tables.map(t => t.name).join(', '));

// Expected tables
const expected = ['users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions', 'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources', 'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences'];
const actual = tables.map(t => t.name);

const missing = expected.filter(t => !actual.includes(t));
const extra = actual.filter(t => !expected.includes(t));

if (missing.length > 0) console.log('Missing tables:', missing.join(', '));
if (extra.length > 0) console.log('Extra tables:', extra.join(', '));

if (missing.length === 0) console.log('✓ All expected tables present');

// Check users table columns
if (actual.includes('users')) {
  const userInfo = db.prepare('PRAGMA table_info(users)').all();
  console.log('\nusers table columns:', userInfo.map(c => c.name).join(', '));

  const expectedUserCols = ['id', 'email', 'password', 'name', 'role', 'created_at', 'updated_at'];
  const actualUserCols = userInfo.map(c => c.name);
  const missingUserCols = expectedUserCols.filter(c => !actualUserCols.includes(c));
  if (missingUserCols.length === 0) console.log('✓ users table has expected columns');
}

// Check projects table columns
if (actual.includes('projects')) {
  const projectInfo = db.prepare('PRAGMA table_info(projects)').all();
  console.log('\nprojects table columns:', projectInfo.map(c => c.name).join(', '));

  const expectedProjectCols = ['id', 'user_id', 'title', 'genre', 'created_at', 'updated_at'];
  const actualProjectCols = projectInfo.map(c => c.name);
  const missingProjectCols = expectedProjectCols.filter(c => !actualProjectCols.includes(c));
  if (missingProjectCols.length === 0) console.log('✓ projects table has expected columns');
}

// Check chapters table columns
if (actual.includes('chapters')) {
  const chapterInfo = db.prepare('PRAGMA table_info(chapters)').all();
  console.log('\nchapters table columns:', chapterInfo.map(c => c.name).join(', '));

  const expectedChapterCols = ['id', 'project_id', 'title', 'content', 'order', 'created_at', 'updated_at'];
  const actualChapterCols = chapterInfo.map(c => c.name);
  const missingChapterCols = expectedChapterCols.filter(c => !actualChapterCols.includes(c));
  if (missingChapterCols.length === 0) console.log('✓ chapters table has expected columns');
}

// Check foreign keys
const fkEnabled = db.prepare('PRAGMA foreign_keys').get();
console.log('\nForeign keys enabled:', fkEnabled.foreign_keys);
if (fkEnabled.foreign_keys === 1) console.log('✓ Foreign key constraints enabled');

db.close();
