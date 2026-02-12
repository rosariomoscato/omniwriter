#!/usr/bin/env node
// Test Feature 1: Database connection established
// This script verifies that the database can be connected to and queried

const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data', 'omniwriter.db');
console.log('[Test] Attempting to connect to database at:', dbPath);

try {
  // Test database connection
  const db = new Database(dbPath, { readonly: true });
  console.log('[Database] SQLite database connected successfully');

  // Check database is responsive
  const result = db.prepare('SELECT 1 as test').get();
  console.log('[Database] Query test result:', result);

  // Check tables exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('[Database] Tables found:', tables.map(t => t.name));

  // Check for critical tables
  const requiredTables = ['users', 'sessions', 'projects', 'chapters', 'sagas'];
  const tableNames = tables.map(t => t.name);
  const missingTables = requiredTables.filter(t => !tableNames.includes(t));

  if (missingTables.length > 0) {
    console.error('[Error] Missing required tables:', missingTables);
    process.exit(1);
  }

  console.log('[Database] All required tables present');
  console.log('[Success] Feature 1 verified: Database connection established');

  db.close();
  process.exit(0);
} catch (error) {
  console.error('[Error] Database connection failed:', error.message);
  process.exit(1);
}
