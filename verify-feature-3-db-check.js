#!/usr/bin/env node
// Feature 3: Check if test user is in database
const path = require('path');
const Database = require(path.join(__dirname, 'server', 'node_modules', 'better-sqlite3'));

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath);

const testEmail = 'feature3_persistence_test_1739378700950@test.com';

console.log('=== Feature 3: Database Persistence Check ===');
console.log('Looking for user:', testEmail);

const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE email = ?').get(testEmail);

if (user) {
  console.log('✅ User found in database:');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Name:', user.name);
  console.log('   Created at:', user.created_at);
  console.log('\n✅ Feature 3 PARTIAL PASS: Data is being persisted to database');
  console.log('   (Full restart test requires server restart capability)');
  db.close();
  process.exit(0);
} else {
  console.log('❌ User NOT found in database');
  console.log('\nThis suggests either:');
  console.log('  1. User registration failed');
  console.log('  2. Database is not persisting data');
  console.log('  3. Database connection is using in-memory storage');
  db.close();
  process.exit(1);
}
