const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db', { readonly: true });

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log("=== ALL TABLES IN DATABASE ===");
tables.forEach(t => console.log(`  - ${t.name}`));
console.log(`\nTotal tables: ${tables.length}`);

// Required tables according to feature 2
const requiredTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions',
  'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources',
  'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences'
];

console.log("\n=== REQUIRED TABLES CHECK ===");
requiredTables.forEach(table => {
  const exists = tables.some(t => t.name === table);
  console.log(`${exists ? '✓' : '✗'} ${table}`);
});

// Check key columns on users table
console.log("\n=== USERS TABLE COLUMNS ===");
const usersColumns = db.prepare("PRAGMA table_info(users)").all();
usersColumns.forEach(col => {
  console.log(`  - ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.pk > 0 ? ' PRIMARY KEY' : ''}`);
});

// Check foreign keys are enabled
const fkStatus = db.prepare("PRAGMA foreign_keys").get();
console.log(`\n=== FOREIGN KEYS ===`);
console.log(`Foreign keys enabled: ${fkStatus.foreign_keys === 1 ? '✓ Yes' : '✗ No'}`);

db.close();
