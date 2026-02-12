import { initializeDatabase } from './dist/db/database.js';

const db = initializeDatabase();

// Check if our test user exists
const testUser = db.prepare(
  "SELECT id, email, name, created_at FROM users WHERE email LIKE 'persistence-test-%' ORDER BY created_at DESC LIMIT 1"
).get();

if (testUser) {
  console.log('✓ TEST USER FOUND IN DATABASE:');
  console.log('  ID:', testUser.id);
  console.log('  Email:', testUser.email);
  console.log('  Name:', testUser.name);
  console.log('  Created:', testUser.created_at);
} else {
  console.log('✗ NO TEST USER FOUND');
}

process.exit(0);
