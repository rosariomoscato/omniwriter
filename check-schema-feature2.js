const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data', 'omniwriter.db');
const db = new Database(dbPath, { readonly: true });

console.log('=== Database Schema Verification ===\n');

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
console.log('All tables in database:');
tables.forEach(t => console.log(`  - ${t.name}`));
console.log(`\nTotal tables: ${tables.length}\n`);

// Expected tables
const expectedTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions',
  'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources',
  'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences',
  'citations', 'chapter_comments', 'llm_providers', 'ai_models', 'project_sources',
  'token_usage', 'audit_logs'
];

console.log('Expected tables verification:');
const missing = expectedTables.filter(t => !tables.find(tbl => tbl.name === t));
const present = expectedTables.filter(t => tables.find(tbl => tbl.name === t));

present.forEach(t => console.log(`  ✓ ${t}`));
missing.forEach(t => console.log(`  ✗ ${t} (MISSING)`));

console.log(`\nPresent: ${present.length}/${expectedTables.length}`);
console.log(`Missing: ${missing.length}\n`);

// Check key table schemas
console.log('=== Key Table Schemas ===\n');

// Users table
console.log('users table columns:');
const usersColumns = db.prepare("PRAGMA table_info(users)").all();
usersColumns.forEach(col => {
  console.log(`  - ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.pk > 0 ? ' PK' : ''}`);
});

console.log('\nprojects table columns:');
const projectsColumns = db.prepare("PRAGMA table_info(projects)").all();
projectsColumns.forEach(col => {
  console.log(`  - ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.pk > 0 ? ' PK' : ''}`);
});

console.log('\nchapters table columns:');
const chaptersColumns = db.prepare("PRAGMA table_info(chapters)").all();
chaptersColumns.forEach(col => {
  console.log(`  - ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.pk > 0 ? ' PK' : ''}`);
});

// Check foreign keys
console.log('\n=== Foreign Key Status ===');
const fkStatus = db.prepare("PRAGMA foreign_keys").get();
console.log(`Foreign keys enabled: ${fkStatus.foreign_keys === 1 ? 'YES ✓' : 'NO ✗'}`);

db.close();
