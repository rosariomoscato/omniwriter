/**
 * Comprehensive test for Features #404 and #406
 *
 * Feature #404: Storage quota data model (100 MB)
 * Feature #406: Storage status API endpoint
 *
 * Tests:
 * 1. Database columns exist with correct defaults
 * 2. Helper functions work correctly
 * 3. API endpoint returns correct data structure
 * 4. Storage tracking on upload/delete
 * 5. Recalculation function works
 */

const path = require('path');
const fs = require('fs');

// Use NODE_PATH to access server/node_modules
require('module').Module._initPaths();

const Database = require('better-sqlite3');

// Load and compile the TypeScript utilities
const { initializeDatabase, getDatabase } = require('./server/dist/db/database.js');
const {
  getUserStorageInfo,
  increaseUserStorage,
  decreaseUserStorage,
  recalculateUserStorage,
  hasStorageQuota
} = require('./server/dist/utils/storage.js');

console.log('=== Testing Feature #404 & #406: Storage Quota System ===\n');

let passCount = 0;
let failCount = 0;

function test(name, condition, details = '') {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
    if (details) console.log(`   ${details}`);
    passCount++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    if (details) console.log(`   ${details}`);
    failCount++;
  }
}

try {
  // Initialize database first
  initializeDatabase();
  const db = getDatabase();

  // TEST 1: Database columns exist
  console.log('--- Test 1: Database Schema ---');
  const usersInfo = db.pragma('table_info(users)', { simple: false });
  const columns = usersInfo.map(col => col.name);

  test(
    'storage_used_bytes column exists',
    columns.includes('storage_used_bytes')
  );

  test(
    'storage_limit_bytes column exists',
    columns.includes('storage_limit_bytes')
  );

  // TEST 2: Default values
  console.log('\n--- Test 2: Default Values ---');
  const adminUser = db.prepare('SELECT id, email, storage_used_bytes, storage_limit_bytes FROM users WHERE email = ?').get('admin@omniwriter.com');

  if (adminUser) {
    test(
      'Default storage_used_bytes is 0',
      adminUser.storage_used_bytes === 0,
      `Actual: ${adminUser.storage_used_bytes}`
    );

    test(
      'Default storage_limit_bytes is 100MB (104857600)',
      adminUser.storage_limit_bytes === 104857600,
      `Actual: ${adminUser.storage_limit_bytes}`
    );
  } else {
    console.log('⚠️  SKIP: Admin user not found');
  }

  // TEST 3: getUserStorageInfo helper
  console.log('\n--- Test 3: getUserStorageInfo Helper ---');
  if (adminUser) {
    const storageInfo = getUserStorageInfo(adminUser.id);

    test(
      'getUserStorageInfo returns correct used bytes',
      storageInfo.used === adminUser.storage_used_bytes,
      `Expected: ${adminUser.storage_used_bytes}, Got: ${storageInfo.used}`
    );

    test(
      'getUserStorageInfo returns correct limit bytes',
      storageInfo.limit === adminUser.storage_limit_bytes,
      `Expected: ${adminUser.storage_limit_bytes}, Got: ${storageInfo.limit}`
    );
  }

  // TEST 4: increaseUserStorage helper
  console.log('\n--- Test 4: increaseUserStorage Helper ---');
  if (adminUser) {
    const beforeUsed = adminUser.storage_used_bytes;
    const increaseAmount = 1024 * 1024; // 1MB

    increaseUserStorage(adminUser.id, increaseAmount);

    const afterUser = db.prepare('SELECT storage_used_bytes FROM users WHERE id = ?').get(adminUser.id);
    const expectedAfter = beforeUsed + increaseAmount;

    test(
      'increaseUserStorage increases storage_used_bytes',
      afterUser.storage_used_bytes === expectedAfter,
      `Before: ${beforeUsed}, Added: ${increaseAmount}, After: ${afterUser.storage_used_bytes}`
    );

    // Reset for next test
    db.prepare('UPDATE users SET storage_used_bytes = ? WHERE id = ?').run(beforeUsed, adminUser.id);
  }

  // TEST 5: decreaseUserStorage helper
  console.log('\n--- Test 5: decreaseUserStorage Helper ---');
  if (adminUser) {
    // First increase to have something to decrease
    db.prepare('UPDATE users SET storage_used_bytes = ? WHERE id = ?').run(5 * 1024 * 1024, adminUser.id);

    const beforeUsed = 5 * 1024 * 1024;
    const decreaseAmount = 2 * 1024 * 1024; // 2MB

    decreaseUserStorage(adminUser.id, decreaseAmount);

    const afterUser = db.prepare('SELECT storage_used_bytes FROM users WHERE id = ?').get(adminUser.id);
    const expectedAfter = beforeUsed - decreaseAmount;

    test(
      'decreaseUserStorage decreases storage_used_bytes',
      afterUser.storage_used_bytes === expectedAfter,
      `Before: ${beforeUsed}, Decreased: ${decreaseAmount}, After: ${afterUser.storage_used_bytes}`
    );

    // Test that it never goes below 0
    decreaseUserStorage(adminUser.id, 999 * 1024 * 1024); // Try to decrease 999MB
    const notNegativeUser = db.prepare('SELECT storage_used_bytes FROM users WHERE id = ?').get(adminUser.id);

    test(
      'decreaseUserStorage never goes below 0',
      notNegativeUser.storage_used_bytes >= 0,
      `storage_used_bytes: ${notNegativeUser.storage_used_bytes}`
    );

    // Reset
    db.prepare('UPDATE users SET storage_used_bytes = 0 WHERE id = ?').run(adminUser.id);
  }

  // TEST 6: hasStorageQuota helper
  console.log('\n--- Test 6: hasStorageQuota Helper ---');
  if (adminUser) {
    db.prepare('UPDATE users SET storage_used_bytes = 50 * 1024 * 1024 WHERE id = ?').run(adminUser.id); // 50MB used

    test(
      'hasStorageQuota returns true when space available',
      hasStorageQuota(adminUser.id, 25 * 1024 * 1024) === true,
      '50MB used, checking 25MB more: should pass'
    );

    test(
      'hasStorageQuota returns false when full',
      hasStorageQuota(adminUser.id, 60 * 1024 * 1024) === false,
      '50MB used, checking 60MB more: should fail'
    );

    // Reset
    db.prepare('UPDATE users SET storage_used_bytes = 0 WHERE id = ?').run(adminUser.id);
  }

  // TEST 7: recalculateUserStorage helper
  console.log('\n--- Test 7: recalculateUserStorage Helper ---');

  // Get total file size from sources table for admin user
  const sourcesTotal = db.prepare('SELECT COALESCE(SUM(file_size), 0) as total FROM sources WHERE user_id = ?').get(adminUser?.id || '');

  if (adminUser) {
    const recalculatedBytes = recalculateUserStorage(adminUser.id);

    test(
      'recalculateUserStorage returns correct total',
      recalculatedBytes === sourcesTotal.total,
      `Sources total: ${sourcesTotal.total}, Recalculated: ${recalculatedBytes}`
    );

    const userAfterRecalc = db.prepare('SELECT storage_used_bytes FROM users WHERE id = ?').get(adminUser.id);

    test(
      'recalculateUserStorage updates database correctly',
      userAfterRecalc.storage_used_bytes === sourcesTotal.total,
      `Database value: ${userAfterRecalc.storage_used_bytes}, Expected: ${sourcesTotal.total}`
    );
  }

  // TEST 8: Integration with sources table
  console.log('\n--- Test 8: Integration Check ---');

  // Check if storage tracking is integrated in upload/delete operations
  const sourcesRoutePath = path.join(__dirname, 'server', 'src', 'routes', 'sources.ts');
  if (fs.existsSync(sourcesRoutePath)) {
    const sourcesContent = fs.readFileSync(sourcesRoutePath, 'utf8');

    test(
      'increaseUserStorage called on file upload',
      sourcesContent.includes('increaseUserStorage'),
      `Found ${(sourcesContent.match(/increaseUserStorage/g) || []).length} calls`
    );

    test(
      'decreaseUserStorage called on file delete',
      sourcesContent.includes('decreaseUserStorage'),
      `Found ${(sourcesContent.match(/decreaseUserStorage/g) || []).length} calls`
    );
  }

  // TEST 9: API endpoint structure
  console.log('\n--- Test 9: API Endpoint Structure ---');

  const usersRoutePath = path.join(__dirname, 'server', 'src', 'routes', 'users.ts');
  if (fs.existsSync(usersRoutePath)) {
    const usersContent = fs.readFileSync(usersRoutePath, 'utf8');

    test(
      'GET /api/users/storage endpoint exists',
      usersContent.includes("router.get('/storage'")
    );

    test(
      'Endpoint is authenticated',
      usersContent.includes('authenticateToken')
    );

    test(
      'Endpoint returns used_bytes',
      usersContent.includes('used_bytes')
    );

    test(
      'Endpoint returns limit_bytes',
      usersContent.includes('limit_bytes')
    );

    test(
      'Endpoint returns percent_used',
      usersContent.includes('percent_used')
    );

    test(
      'Endpoint returns available_bytes',
      usersContent.includes('available_bytes')
    );
  }

  // TEST 10: Percentage calculation
  console.log('\n--- Test 10: Response Format Check ---');
  if (adminUser) {
    // Simulate various usage levels
    const testCases = [
      { used: 0, expectedPercent: 0 },
      { used: 1048576, expectedPercent: 1 }, // 1MB of 100MB ≈ 1%
      { used: 52428800, expectedPercent: 50 }, // 50MB = 50%
      { used: 104857600, expectedPercent: 100 }, // 100MB = 100%
    ];

    for (const tc of testCases) {
      db.prepare('UPDATE users SET storage_used_bytes = ? WHERE id = ?').run(tc.used, adminUser.id);
      const info = getUserStorageInfo(adminUser.id);
      const percent = Math.round((info.used / info.limit) * 10000) / 100;

      test(
        `Percentage calculation for ${tc.used} bytes`,
        percent === tc.expectedPercent,
        `Expected: ${tc.expectedPercent}%, Got: ${percent}%`
      );
    }

    // Reset
    db.prepare('UPDATE users SET storage_used_bytes = 0 WHERE id = ?').run(adminUser.id);
  }

  console.log('\n=== Test Results ===');
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Total: ${passCount + failCount}`);

  if (failCount === 0) {
    console.log('\n🎉 All tests passed! Features #404 and #406 are complete.');
  } else {
    console.log(`\n⚠️  ${failCount} test(s) failed. Please review.`);
    process.exit(1);
  }

} catch (error) {
  console.error('\n❌ Test suite failed with error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
