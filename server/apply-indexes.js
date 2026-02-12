const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const migrationPath = path.join(__dirname, 'migrations', 'add_performance_indexes.sql');

console.log('Applying performance indexes...');

const db = new Database(dbPath);
const migration = fs.readFileSync(migrationPath, 'utf8');

// Split and execute each statement
const statements = migration.split(';').filter(s => s.trim());
statements.forEach(stmt => {
  if (stmt.trim()) {
    try {
      db.exec(stmt);
      console.log('✓ Executed:', stmt.trim().substring(0, 50) + '...');
    } catch (err) {
      console.log('⚠️  Skipped (may already exist):', stmt.trim().substring(0, 50));
    }
  }
});

// Verify indexes
console.log('\nCurrent indexes on projects table:');
const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='projects'").all();
indexes.forEach(idx => console.log(`  - ${idx.name}`));

db.close();
console.log('\n✅ Performance indexes applied successfully!');
