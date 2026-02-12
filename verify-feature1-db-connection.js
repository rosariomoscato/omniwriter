#!/usr/bin/env node
/**
 * Verify Feature #1: Database connection established
 * Verify Feature #2: Database schema applied correctly
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
console.log('='.repeat(60));
console.log('FEATURE #1 & #2 VERIFICATION');
console.log('='.repeat(60));
console.log(`Database path: ${dbPath}\n`);

let db;
try {
  db = new Database(dbPath, { readonly: true });
  console.log('✅ Database connection established successfully\n');
} catch (err) {
  console.log('❌ Database connection FAILED:', err.message);
  process.exit(1);
}

// Feature #2: Verify schema
console.log('='.repeat(60));
console.log('FEATURE #2: Database Schema Verification');
console.log('='.repeat(60));

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('\n📋 Tables in database:');
tables.forEach(t => console.log(`  - ${t.name}`));

// Expected tables from app_spec.txt
const expectedTables = [
  'users',
  'sessions',
  'projects',
  'sagas',
  'chapters',
  'chapter_versions',
  'characters',
  'locations',
  'plot_events',
  'human_models',
  'human_model_sources',
  'sources',
  'generation_logs',
  'project_tags',
  'export_history',
  'user_preferences'
];

console.log('\n📋 Expected tables from app_spec.txt:');
let missingTables = [];
expectedTables.forEach(table => {
  const exists = tables.some(t => t.name === table);
  if (exists) {
    console.log(`  ✅ ${table}`);
  } else {
    console.log(`  ❌ ${table} - MISSING!`);
    missingTables.push(table);
  }
});

// Verify key columns on users table
console.log('\n📋 users table columns:');
try {
  const usersColumns = db.prepare("PRAGMA table_info(users)").all();
  const expectedUserColumns = ['id', 'email', 'password_hash', 'name', 'role', 'created_at'];

  expectedUserColumns.forEach(col => {
    const exists = usersColumns.some(c => c.name === col);
    if (exists) {
      console.log(`  ✅ ${col}`);
    } else {
      console.log(`  ❌ ${col} - MISSING!`);
    }
  });
} catch (err) {
  console.log(`  ❌ Error checking users table: ${err.message}`);
}

// Verify key columns on projects table
console.log('\n📋 projects table columns:');
try {
  const projectsColumns = db.prepare("PRAGMA table_info(projects)").all();
  const expectedProjectColumns = ['id', 'user_id', 'title', 'area', 'status', 'created_at'];

  expectedProjectColumns.forEach(col => {
    const exists = projectsColumns.some(c => c.name === col);
    if (exists) {
      console.log(`  ✅ ${col}`);
    } else {
      console.log(`  ❌ ${col} - MISSING!`);
    }
  });
} catch (err) {
  console.log(`  ❌ Error checking projects table: ${err.message}`);
}

// Check foreign keys
console.log('\n📋 Foreign keys status:');
try {
  const fkStatus = db.prepare("PRAGMA foreign_keys").get();
  console.log(`  Foreign keys: ${fkStatus.foreign_keys === 1 ? '✅ ENABLED' : '❌ DISABLED'}`);
} catch (err) {
  console.log(`  ❌ Error checking foreign keys: ${err.message}`);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));

if (missingTables.length === 0) {
  console.log('✅ All expected tables exist');
  console.log('\nFeature #1: ✅ PASS - Database connection established');
  console.log('Feature #2: ✅ PASS - Database schema applied correctly');
} else {
  console.log(`❌ Missing ${missingTables.length} tables: ${missingTables.join(', ')}`);
  console.log('\nFeature #1: ✅ PASS - Database connection established');
  console.log('Feature #2: ❌ FAIL - Missing tables in schema');
}

db.close();
