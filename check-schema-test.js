const Database = require('better-sqlite3');
const db = new Database('./server/data/omniwriter.db');

console.log('=== Checking Database Schema ===\n');

// List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables found:', tables.map(t => t.name).join(', '));
console.log('Total tables:', tables.length);
console.log();

// Expected tables
const expectedTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions',
  'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources',
  'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences'
];

console.log('Expected tables:', expectedTables.join(', '));
console.log();

// Check each expected table exists
const foundTableNames = tables.map(t => t.name);
const missingTables = expectedTables.filter(t => !foundTableNames.includes(t));
if (missingTables.length > 0) {
  console.log('MISSING TABLES:', missingTables.join(', '));
} else {
  console.log('All expected tables exist!');
}

console.log();

// Check users table columns
console.log('=== Users table columns ===');
const usersSchema = db.prepare("PRAGMA table_info(users)").all();
usersSchema.forEach(col => console.log(`  ${col.name}: ${col.type}`));

console.log();

// Check projects table columns
console.log('=== Projects table columns ===');
const projectsSchema = db.prepare("PRAGMA table_info(projects)").all();
projectsSchema.forEach(col => console.log(`  ${col.name}: ${col.type}`));

console.log();

// Check chapters table columns
console.log('=== Chapters table columns ===');
const chaptersSchema = db.prepare("PRAGMA table_info(chapters)").all();
chaptersSchema.forEach(col => console.log(`  ${col.name}: ${col.type}`));

console.log();

// Check foreign keys are enabled
console.log('=== Foreign key check ===');
const fkCheck = db.prepare("PRAGMA foreign_keys").get();
console.log('Foreign keys enabled:', fkCheck ? 'YES' : 'NO');

db.close();
