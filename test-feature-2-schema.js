#!/usr/bin/env node
// Test Feature 2: Database schema applied correctly
// Verify all tables and columns exist

const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data', 'omniwriter.db');
console.log('[Test] Verifying database schema...');

try {
  const db = new Database(dbPath, { readonly: true });

  // Get all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  const tableNames = tables.map(t => t.name);
  console.log('[Database] Found tables:', tableNames);

  // Required tables from spec
  const requiredTables = [
    'users', 'sessions', 'projects', 'sagas', 'chapters',
    'chapter_versions', 'characters', 'locations', 'plot_events',
    'human_models', 'human_model_sources', 'sources', 'generation_logs',
    'project_tags', 'export_history', 'user_preferences', 'citations'
  ];

  // Check all required tables exist
  const missingTables = requiredTables.filter(t => !tableNames.includes(t));
  if (missingTables.length > 0) {
    console.error('[Error] Missing required tables:', missingTables);
    process.exit(1);
  }
  console.log('[Success] All required tables present');

  // Verify key columns on users table
  const usersColumns = db.prepare("PRAGMA table_info(users)").all();
  const usersColNames = usersColumns.map(c => c.name);
  const requiredUsersCols = ['id', 'email', 'password_hash', 'name', 'role', 'created_at'];
  const missingUsersCols = requiredUsersCols.filter(c => !usersColNames.includes(c));
  if (missingUsersCols.length > 0) {
    console.error('[Error] Missing columns in users table:', missingUsersCols);
    process.exit(1);
  }
  console.log('[Success] Users table has required columns:', usersColNames);

  // Verify key columns on projects table
  const projectsColumns = db.prepare("PRAGMA table_info(projects)").all();
  const projectsColNames = projectsColumns.map(c => c.name);
  const requiredProjectsCols = ['id', 'user_id', 'saga_id', 'title', 'area', 'status', 'word_count', 'created_at'];
  const missingProjectsCols = requiredProjectsCols.filter(c => !projectsColNames.includes(c));
  if (missingProjectsCols.length > 0) {
    console.error('[Error] Missing columns in projects table:', missingProjectsCols);
    process.exit(1);
  }
  console.log('[Success] Projects table has required columns:', projectsColNames);

  // Verify key columns on chapters table
  const chaptersColumns = db.prepare("PRAGMA table_info(chapters)").all();
  const chaptersColNames = chaptersColumns.map(c => c.name);
  const requiredChaptersCols = ['id', 'project_id', 'title', 'content', 'order_index', 'status', 'word_count', 'created_at'];
  const missingChaptersCols = requiredChaptersCols.filter(c => !chaptersColNames.includes(c));
  if (missingChaptersCols.length > 0) {
    console.error('[Error] Missing columns in chapters table:', missingChaptersCols);
    process.exit(1);
  }
  console.log('[Success] Chapters table has required columns:', chaptersColNames);

  // Verify foreign keys are enabled
  const fkResult = db.prepare('PRAGMA foreign_keys').get();
  if (fkResult.foreign_keys !== 1) {
    console.error('[Error] Foreign keys not enabled:', fkResult);
    process.exit(1);
  }
  console.log('[Success] Foreign keys enabled');

  console.log('[Success] Feature 2 verified: Database schema applied correctly');
  db.close();
  process.exit(0);
} catch (error) {
  console.error('[Error] Schema verification failed:', error.message);
  process.exit(1);
}
