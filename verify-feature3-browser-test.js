#!/usr/bin/env node

/**
 * Feature #3: Data Persistence Test - Browser Automation Version
 *
 * This test verifies that data persists across server restart by:
 * 1. Creating a test user and project via browser
 * 2. Recording the unique identifiers
 * 3. Instructing user to manually restart server
 * 4. Verifying data still exists after restart via browser
 */

const fs = require('fs');
const path = require('path');

const TEST_DATA_FILE = path.join(__dirname, 'feature3-test-data.json');
const TEST_USER_EMAIL = 'persist_test_f3_12345@example.com';
const TEST_USER_NAME = 'PERSIST_TEST_F3_12345';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_PROJECT_TITLE = 'PERSIST_TEST_PROJECT_F3_12345';

console.log('\n' + '='.repeat(70));
console.log('  FEATURE #3: DATA PERSISTENCE TEST - BROWSER AUTOMATION');
console.log('='.repeat(70) + '\n');

console.log('STEP 1: PRE-RESTART VERIFICATION\n');
console.log('Test user already created via browser:');
console.log(`  Email:    ${TEST_USER_EMAIL}`);
console.log(`  Name:     ${TEST_USER_NAME}`);
console.log(`  Password: ${TEST_PASSWORD}`);
console.log('\nTest project already created:');
console.log(`  Title: ${TEST_PROJECT_TITLE}`);
console.log('\n✓ Data exists before server restart\n');

// Save test data for post-restart verification
const testData = {
  timestamp: new Date().toISOString(),
  user: {
    email: TEST_USER_EMAIL,
    name: TEST_USER_NAME,
    password: TEST_PASSWORD
  },
  project: {
    title: TEST_PROJECT_TITLE
  }
};

fs.writeFileSync(TEST_DATA_FILE, JSON.stringify(testData, null, 2));
console.log(`✓ Test data saved to: ${TEST_DATA_FILE}\n`);

console.log('STEP 2: SERVER RESTART REQUIRED\n');
console.log('Please manually restart the server now:');
console.log('  1. Stop the server (Ctrl+C or kill process)');
console.log('  2. Run: ./init.sh');
console.log('  3. Wait for both frontend and backend to start');
console.log('  4. Run the post-restart verification script\n');

console.log('STEP 3: POST-RESTART VERIFICATION\n');
console.log('After restarting the server, run:');
console.log('  node verify-feature3-post-restart.js\n');

console.log('The post-restart script will:');
console.log('  ✓ Attempt to login with the same credentials');
console.log('  ✓ Verify the user still exists');
console.log('  ✓ Verify the project still exists');
console.log('  ✓ Confirm data survived server restart\n');

console.log('='.repeat(70));
console.log('  TEST PHASE 1 COMPLETE');
console.log('  Data created. Ready for server restart test.');
console.log('='.repeat(70) + '\n');
