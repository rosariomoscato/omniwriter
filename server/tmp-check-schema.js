const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'data/omniwriter.db');

const db = new Database(dbPath, { readonly: true });

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

// Check specific tables required by feature
const requiredTables = ['users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions', 'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources', 'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences', 'password_reset_tokens', 'citations'];

console.log('\nRequired tables check:');
const foundTables = tables.map(t => t.name);
requiredTables.forEach(table => {
  const exists = foundTables.includes(table);
  console.log(`  ${exists ? '✓' : '✗'} ${table}`);
});

// Check key columns on users table
console.log('\nUsers table columns:');
const userColumns = db.prepare("PRAGMA table_info(users)").all();
userColumns.forEach(col => {
  console.log(`  - ${col.name} (${col.type})`);
});

// Check foreign keys are enabled
const fkStatus = db.pragma('foreign_keys', { simple: true });
console.log(`\nForeign keys enabled: ${fkStatus === 1 ? 'Yes' : 'No'}`);

db.close();
