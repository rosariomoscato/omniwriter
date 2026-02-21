const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('./server/data/omniwriter.db');

console.log('=== Feature 2: Database Schema Verification ===\n');

// 1. List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables found:', tables.map(t => t.name).join(', '));
console.log('Table count:', tables.length);

// 2. Expected tables
const expectedTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions',
  'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources',
  'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences'
];

console.log('\n=== Verifying expected tables ===');
let missingTables = [];
for (const table of expectedTables) {
  const found = tables.some(t => t.name === table);
  if (found) {
    console.log(`✓ ${table}`);
  } else {
    console.log(`✗ ${table} - MISSING`);
    missingTables.push(table);
  }
}

// 3. Check key columns on users table
console.log('\n=== Users table columns ===');
const usersSchema = db.prepare("PRAGMA table_info(users)").all();
const usersColumns = usersSchema.map(c => c.name);
console.log('Users columns:', usersColumns.join(', '));
const requiredUsersCols = ['id', 'email', 'password_hash', 'name', 'role'];
const missingUsersCols = requiredUsersCols.filter(c => !usersColumns.includes(c));
if (missingUsersCols.length > 0) {
  console.log('MISSING columns in users:', missingUsersCols.join(', '));
} else {
  console.log('✓ All required users columns present');
}

// 4. Check key columns on projects table
console.log('\n=== Projects table columns ===');
const projectsSchema = db.prepare("PRAGMA table_info(projects)").all();
const projectsColumns = projectsSchema.map(c => c.name);
console.log('Projects columns:', projectsColumns.join(', '));
const requiredProjectsCols = ['id', 'user_id', 'title', 'type', 'status'];
const missingProjectsCols = requiredProjectsCols.filter(c => !projectsColumns.includes(c));
if (missingProjectsCols.length > 0) {
  console.log('MISSING columns in projects:', missingProjectsCols.join(', '));
} else {
  console.log('✓ All required projects columns present');
}

// 5. Check key columns on chapters table
console.log('\n=== Chapters table columns ===');
const chaptersSchema = db.prepare("PRAGMA table_info(chapters)").all();
const chaptersColumns = chaptersSchema.map(c => c.name);
console.log('Chapters columns:', chaptersColumns.join(', '));
const requiredChaptersCols = ['id', 'project_id', 'title', 'content', 'chapter_number'];
const missingChaptersCols = requiredChaptersCols.filter(c => !chaptersColumns.includes(c));
if (missingChaptersCols.length > 0) {
  console.log('MISSING columns in chapters:', missingChaptersCols.join(', '));
} else {
  console.log('✓ All required chapters columns present');
}

// 6. Check foreign key constraints are enabled
console.log('\n=== Foreign key constraints ===');
const fkStatus = db.prepare("PRAGMA foreign_keys").get();
console.log('Foreign keys enabled:', fkStatus ? fkStatus.foreign_keys : 'N/A');

// Summary
console.log('\n=== VERIFICATION SUMMARY ===');
if (missingTables.length === 0) {
  console.log('✓ All expected tables present');
} else {
  console.log('✗ Missing tables:', missingTables.join(', '));
}

if (missingUsersCols.length === 0 && missingProjectsCols.length === 0 && missingChaptersCols.length === 0) {
  console.log('✓ All required columns present in key tables');
} else {
  console.log('✗ Some columns missing');
}

db.close();
