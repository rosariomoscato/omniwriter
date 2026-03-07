const Database = require('./node_modules/better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath, { readonly: true });

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
console.log('Tables found:', tables.length);
console.log('Tables:', tables.map(t => t.name).join(', '));

// Check for required tables
const requiredTables = ['users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions', 'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources', 'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences'];
const missingTables = requiredTables.filter(t => !tables.find(table => table.name === t));

if (missingTables.length > 0) {
  console.log('\n❌ Missing tables:', missingTables.join(', '));
} else {
  console.log('\n✅ All required tables exist');
}

// Check users table columns
const usersColumns = db.prepare("PRAGMA table_info(users)").all();
console.log('\nUsers table columns:', usersColumns.map(c => c.name).join(', '));

// Check projects table columns
const projectsColumns = db.prepare("PRAGMA table_info(projects)").all();
console.log('\nProjects table columns:', projectsColumns.map(c => c.name).join(', '));

// Check chapters table columns
const chaptersColumns = db.prepare("PRAGMA table_info(chapters)").all();
console.log('\nChapters table columns:', chaptersColumns.map(c => c.name).join(', '));

// Check foreign keys are enabled
const fkStatus = db.pragma('foreign_keys', { simple: true });
console.log('\nForeign keys enabled:', fkStatus === 1 ? '✅ Yes' : '❌ No');

db.close();
