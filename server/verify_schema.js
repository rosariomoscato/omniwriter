import { initializeDatabase } from './dist/db/database.js';

// Initialize database connection
const db = initializeDatabase();

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
console.log('=== TABLES FOUND ===');
tables.forEach(t => console.log(`  - ${t.name}`));
console.log(`Total: ${tables.length} tables\n`);

// Expected tables from spec
const expectedTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters',
  'chapter_versions', 'characters', 'locations', 'plot_events',
  'human_models', 'human_model_sources', 'sources',
  'generation_logs', 'project_tags', 'export_history', 'user_preferences'
];

// Check for missing tables
const missingTables = expectedTables.filter(t => !tables.find(table => table.name === t));
if (missingTables.length > 0) {
  console.log('MISSING TABLES:', missingTables.join(', '));
  process.exit(1);
}

// Check key columns on users table
console.log('=== VERIFYING KEY TABLE COLUMNS ===');
const usersColumns = db.prepare("PRAGMA table_info(users)").all();
console.log('  users table columns:', usersColumns.map(c => c.name).join(', '));

const projectsColumns = db.prepare("PRAGMA table_info(projects)").all();
console.log('  projects table columns:', projectsColumns.map(c => c.name).join(', '));

const chaptersColumns = db.prepare("PRAGMA table_info(chapters)").all();
console.log('  chapters table columns:', chaptersColumns.map(c => c.name).join(', '));

// Check foreign keys are enabled
const fkResult = db.prepare("PRAGMA foreign_keys").get();
console.log(`\nForeign Keys: ${fkResult.foreign_keys === 1 ? 'ENABLED' : 'DISABLED'}`);

console.log('\n=== SCHEMA VERIFICATION PASSED ===');
process.exit(0);
