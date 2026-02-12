const Database = require('better-sqlite3');
const db = new Database('./data/omniwriter.db');

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log("Tables found:");
tables.forEach(t => console.log("  - " + t.name));

// Required tables from app_spec
const requiredTables = [
  'users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions',
  'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources',
  'sources', 'generation_logs', 'project_tags', 'export_history', 'user_preferences'
];

console.log("\nRequired tables check:");
let allRequiredPresent = true;
requiredTables.forEach(table => {
  const exists = tables.some(t => t.name === table);
  console.log(`  ${exists ? '✓' : '✗'} ${table}`);
  if (!exists) allRequiredPresent = false;
});

// Check foreign keys
const fkStatus = db.prepare("PRAGMA foreign_keys").get();
console.log("\nForeign keys enabled:", fkStatus.foreign_keys === 1 ? "✓ Yes" : "✗ No");

// Check key columns on users table
console.log("\nUsers table columns:");
const userCols = db.prepare("PRAGMA table_info(users)").all();
userCols.forEach(col => console.log(`  - ${col.name} (${col.type})`));

// Check projects table columns
console.log("\nProjects table columns:");
const projCols = db.prepare("PRAGMA table_info(projects)").all();
projCols.forEach(col => console.log(`  - ${col.name} (${col.type})`));

// Check chapters table columns
console.log("\nChapters table columns:");
const chapCols = db.prepare("PRAGMA table_info(chapters)").all();
chapCols.forEach(col => console.log(`  - ${col.name} (${col.type})`));

console.log("\nOverall Status:", allRequiredPresent ? "✓ PASS" : "✗ FAIL");

db.close();
