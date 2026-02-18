const Database = require('better-sqlite3');
const path = require('path');

const dbPath = '/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db';
const db = new Database(dbPath);

console.log('=== Feature 2: Database Schema Verification ===\n');

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
console.log('Tables in database:');
tables.forEach(t => console.log(`  - ${t.name}`));
console.log(`\nTotal tables: ${tables.length}\n`);

// Expected tables
const expectedTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions',
  'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources',
  'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences'
];

console.log('Expected tables verification:');
expectedTables.forEach(tableName => {
  const exists = tables.some(t => t.name === tableName);
  console.log(`  ${exists ? '✓' : '✗'} ${tableName}`);
});

console.log('\n=== Key Columns Verification ===\n');

// Users table columns
console.log('Users table columns:');
const userColumns = db.prepare("PRAGMA table_info(users)").all();
userColumns.forEach(col => {
  console.log(`  - ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PK' : ''}`);
});

console.log('\nProjects table columns:');
const projectColumns = db.prepare("PRAGMA table_info(projects)").all();
projectColumns.forEach(col => {
  console.log(`  - ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PK' : ''}`);
});

console.log('\nChapters table columns:');
const chapterColumns = db.prepare("PRAGMA table_info(chapters)").all();
chapterColumns.forEach(col => {
  console.log(`  - ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PK' : ''}`);
});

console.log('\n=== Foreign Key Settings ===');
const fkSettings = db.prepare("PRAGMA foreign_keys").get();
console.log(`Foreign keys enabled: ${fkSettings.foreign_keys === 1 ? '✓ Yes' : '✗ No'}`);

db.close();
console.log('\n=== Schema Verification Complete ===');
