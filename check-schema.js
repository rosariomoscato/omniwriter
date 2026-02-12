const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('./server/data/omniwriter.db');

console.log('=== Tables in database ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(t => console.log(`- ${t.name}`));

console.log('\n=== Expected tables ===');
const expected = [
  'users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions',
  'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources',
  'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences'
];
expected.forEach(t => {
  const exists = tables.some(table => table.name === t);
  console.log(`${exists ? '✓' : '✗'} ${t}`);
});

console.log('\n=== Users table schema ===');
const userSchema = db.prepare("PRAGMA table_info(users)").all();
userSchema.forEach(col => console.log(`  - ${col.name} (${col.type})`));

console.log('\n=== Projects table schema ===');
const projectSchema = db.prepare("PRAGMA table_info(projects)").all();
projectSchema.forEach(col => console.log(`  - ${col.name} (${col.type})`));

console.log('\n=== Chapters table schema ===');
const chapterSchema = db.prepare("PRAGMA table_info(chapters)").all();
chapterSchema.forEach(col => console.log(`  - ${col.name} (${col.type})`));

console.log('\n=== Foreign keys enabled ===');
const fk = db.pragma('foreign_keys');
console.log(`Foreign keys: ${fk === 1 ? '✓ Enabled' : '✗ Disabled'}`);

db.close();
