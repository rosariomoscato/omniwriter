#!/usr/bin/env node
/**
 * Feature 2 Verification: Database schema applied correctly
 *
 * Tests:
 * 1. Connect to SQLite database directly
 * 2. List all tables using SELECT name FROM sqlite_master
 * 3. Verify required tables exist
 * 4. Verify key columns on users table
 * 5. Verify key columns on projects table
 * 6. Verify key columns on chapters table
 * 7. Verify foreign key constraints are enabled
 */

const { initializeDatabase } = require('./server/dist/db/database');
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/data/omniwriter.db');
process.env.DATABASE_PATH = dbPath;

console.log('=== Feature 2: Database Schema Verification ===\n');

try {
  const db = initializeDatabase();

  // Test 1: List all tables
  console.log('[Test 1] Listing all tables...');
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table'
    ORDER BY name
  `).all();

  const tableNames = tables.map(t => t.name);

  const requiredTables = [
    'users', 'sessions', 'projects', 'sagas', 'chapters', 'chapter_versions',
    'characters', 'locations', 'plot_events', 'human_models', 'human_model_sources',
    'sources', 'generation_logs', 'project_tags', 'export_history',
    'user_preferences', 'chapter_comments', 'password_reset_tokens', 'citations'
  ];

  const missingTables = requiredTables.filter(t => !tableNames.includes(t));

  if (missingTables.length === 0) {
    console.log(`✅ PASS: All ${requiredTables.length} required tables exist`);
  } else {
    console.log(`❌ FAIL: Missing tables: ${missingTables.join(', ')}`);
    process.exit(1);
  }

  // Test 2: Verify key columns on users table
  console.log('\n[Test 2] Verifying users table schema...');
  const userColumns = db.prepare(`PRAGMA table_info(users)`).all();
  const userColumnNames = userColumns.map(c => c.name);

  const requiredUserColumns = ['id', 'email', 'password_hash', 'name', 'role', 'preferred_language', 'theme_preference'];
  const missingUserColumns = requiredUserColumns.filter(c => !userColumnNames.includes(c));

  if (missingUserColumns.length === 0) {
    console.log(`✅ PASS: Users table has all required columns`);
  } else {
    console.log(`❌ FAIL: Users table missing columns: ${missingUserColumns.join(', ')}`);
    process.exit(1);
  }

  // Test 3: Verify key columns on projects table
  console.log('\n[Test 3] Verifying projects table schema...');
  const projectColumns = db.prepare(`PRAGMA table_info(projects)`).all();
  const projectColumnNames = projectColumns.map(c => c.name);

  const requiredProjectColumns = ['id', 'user_id', 'saga_id', 'title', 'area', 'status', 'human_model_id'];
  const missingProjectColumns = requiredProjectColumns.filter(c => !projectColumnNames.includes(c));

  if (missingProjectColumns.length === 0) {
    console.log(`✅ PASS: Projects table has all required columns`);
  } else {
    console.log(`❌ FAIL: Projects table missing columns: ${missingProjectColumns.join(', ')}`);
    process.exit(1);
  }

  // Test 4: Verify key columns on chapters table
  console.log('\n[Test 4] Verifying chapters table schema...');
  const chapterColumns = db.prepare(`PRAGMA table_info(chapters)`).all();
  const chapterColumnNames = chapterColumns.map(c => c.name);

  const requiredChapterColumns = ['id', 'project_id', 'title', 'content', 'order_index', 'status', 'word_count'];
  const missingChapterColumns = requiredChapterColumns.filter(c => !chapterColumnNames.includes(c));

  if (missingChapterColumns.length === 0) {
    console.log(`✅ PASS: Chapters table has all required columns`);
  } else {
    console.log(`❌ FAIL: Chapters table missing columns: ${missingChapterColumns.join(', ')}`);
    process.exit(1);
  }

  // Test 5: Verify foreign key constraints are enabled
  console.log('\n[Test 5] Verifying foreign key constraints...');
  const fkResult = db.prepare('PRAGMA foreign_keys').get();
  if (fkResult && fkResult.foreign_keys === 1) {
    console.log('✅ PASS: Foreign key constraints are enabled');
  } else {
    console.log('❌ FAIL: Foreign key constraints are not enabled');
    process.exit(1);
  }

  // Test 6: Verify indexes exist
  console.log('\n[Test 6] Verifying key indexes...');
  const indexes = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='index'
    AND name LIKE 'idx_%'
    ORDER BY name
  `).all();

  const requiredIndexes = [
    'idx_projects_user_id',
    'idx_chapters_project_id',
    'idx_sessions_user_id',
  ];

  const indexNames = indexes.map(i => i.name);
  const missingIndexes = requiredIndexes.filter(i => !indexNames.includes(i));

  if (missingIndexes.length === 0) {
    console.log(`✅ PASS: All required indexes exist (${indexes.length} total indexes)`);
  } else {
    console.log(`❌ FAIL: Missing indexes: ${missingIndexes.join(', ')}`);
    process.exit(1);
  }

  console.log('\n=== Feature 2: ALL TESTS PASSED ===\n');
  console.log('Summary:');
  console.log(`✅ All ${requiredTables.length} required tables exist`);
  console.log('✅ Users table schema correct');
  console.log('✅ Projects table schema correct');
  console.log('✅ Chapters table schema correct');
  console.log('✅ Foreign key constraints enabled');
  console.log(`✅ Key indexes exist (${indexes.length} total)`);

} catch (error) {
  console.error('❌ FAIL: Database schema error:', error.message);
  process.exit(1);
}
