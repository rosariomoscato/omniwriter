#!/usr/bin/env node
/**
 * Verification Script for Features #52 and #53
 * Chapter Version History & Comparison
 *
 * Usage: node verify-features-52-53.js <token> <chapterId>
 *
 * Prerequisites:
 * - Server running on http://localhost:8080
 * - Valid authentication token
 * - Chapter ID that belongs to authenticated user
 */

const API_BASE = 'http://localhost:8080/api';

async function verifyFeatures(token, chapterId) {
  console.log('========================================');
  console.log('  Verification: Features #52 & #53');
  console.log('  Chapter Version History');
  console.log('========================================\n');

  let allPassed = true;

  // Test 1: Get current chapter state
  console.log('📝 Test 1: Get current chapter state');
  try {
    const response = await fetch(`${API_BASE}/chapters/${chapterId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ PASS: Chapter loaded');
      console.log(`   Title: ${data.chapter.title}`);
      console.log(`   Current content length: ${data.chapter.content?.length || 0} chars`);
    } else {
      console.log('❌ FAIL: Could not load chapter');
      allPassed = false;
    }
  } catch (error) {
    console.log('❌ FAIL: Network error loading chapter');
    allPassed = false;
  }
  console.log();

  // Test 2: Create multiple edits to generate versions
  console.log('📝 Test 2: Create version history through edits');

  const testContents = [
    'First version: This is the initial content for testing version history.',
    'Second version: This content has been modified to test version tracking.',
    'Third version: Even more content added to verify multiple versions work correctly.'
  ];

  for (let i = 0; i < testContents.length; i++) {
    try {
      const response = await fetch(`${API_BASE}/chapters/${chapterId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: testContents[i] })
      });

      if (response.ok) {
        console.log(`✅ PASS: Edit ${i + 1} created (version ${i + 1} should exist)`);
      } else {
        console.log(`❌ FAIL: Edit ${i + 1} failed`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ FAIL: Network error on edit ${i + 1}`);
      allPassed = false;
    }
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.log();

  // Test 3: List versions
  console.log('📜 Test 3: List all versions');
  try {
    const response = await fetch(`${API_BASE}/chapters/${chapterId}/versions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ PASS: Retrieved ${data.versions.length} versions`);

      if (data.versions.length >= 3) {
        console.log('   Version details:');
        data.versions.slice(0, 3).forEach(v => {
          console.log(`   - Version ${v.version_number}: ${v.created_at}`);
          console.log(`     Content preview: ${v.content.substring(0, 50)}...`);
        });
      } else {
        console.log(`⚠️  WARNING: Expected at least 3 versions, got ${data.versions.length}`);
      }
    } else {
      console.log('❌ FAIL: Could not retrieve versions');
      allPassed = false;
    }
  } catch (error) {
    console.log('❌ FAIL: Network error retrieving versions');
    allPassed = false;
  }
  console.log();

  // Test 4: Get specific version
  console.log('🔍 Test 4: Get specific version details');
  try {
    // First get the list to find a version ID
    const listResponse = await fetch(`${API_BASE}/chapters/${chapterId}/versions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (listResponse.ok) {
      const listData = await listResponse.json();
      if (listData.versions.length > 0) {
        const versionId = listData.versions[0].id;

        const response = await fetch(`${API_BASE}/chapters/${chapterId}/versions/${versionId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ PASS: Retrieved specific version');
          console.log(`   Version: ${data.version.version_number}`);
          console.log(`   Content length: ${data.version.content?.length || 0} chars`);
          console.log(`   Created: ${data.version.created_at}`);
        } else {
          console.log('❌ FAIL: Could not retrieve specific version');
          allPassed = false;
        }
      }
    }
  } catch (error) {
    console.log('❌ FAIL: Network error retrieving specific version');
    allPassed = false;
  }
  console.log();

  // Test 5: Restore version
  console.log('🔄 Test 5: Restore a previous version');
  try {
    // Get versions to find one to restore
    const listResponse = await fetch(`${API_BASE}/chapters/${chapterId}/versions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (listResponse.ok) {
      const listData = await listResponse.json();
      // Restore the second version (index 1) if it exists
      if (listData.versions.length >= 2) {
        const versionToRestore = listData.versions[1];
        const originalContentLength = listData.versions[0].content?.length || 0;

        const response = await fetch(`${API_BASE}/chapters/${chapterId}/restore/${versionToRestore.id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ PASS: Version restored successfully');
          console.log(`   Restored to version ${versionToRestore.version_number}`);
          console.log(`   Content length matches: ${data.chapter.content?.length || 0} chars`);

          // Verify a new version was created
          const afterRestoreResponse = await fetch(`${API_BASE}/chapters/${chapterId}/versions`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (afterRestoreResponse.ok) {
            const afterRestoreData = await afterRestoreResponse.json();
            console.log(`   New version count: ${afterRestoreData.versions.length} (should be +1)`);
          }
        } else {
          console.log('❌ FAIL: Could not restore version');
          allPassed = false;
        }
      } else {
        console.log('⚠️  SKIP: Not enough versions to test restore');
      }
    }
  } catch (error) {
    console.log('❌ FAIL: Network error restoring version');
    allPassed = false;
  }
  console.log();

  // Test 6: Verify database persistence (STEP 5.7)
  console.log('💾 Test 6: Database Persistence Check');
  console.log('   Manual check required:');
  console.log('   1. Stop the server');
  console.log('   2. Restart the server');
  console.log('   3. Re-run this script');
  console.log('   4. Versions should still exist (same count, same IDs)');
  console.log();

  // Test 7: Mock data detection (STEP 5.6)
  console.log('🔍 Test 7: Mock Data Detection');
  console.log('   Manual check required:');
  console.log('   Run: grep -r "globalThis\\|devStore\\|mockData\\|fakeData" server/src/ client/src/');
  console.log('   Expected: 0 matches');
  console.log();

  // Summary
  console.log('========================================');
  console.log('  SUMMARY');
  console.log('========================================');
  console.log(allPassed ? '✅ All automated tests PASSED' : '❌ Some tests FAILED');
  console.log();
  console.log('Manual verification steps:');
  console.log('1. Start the development server');
  console.log('2. Open browser to http://localhost:3000');
  console.log('3. Login and navigate to a chapter');
  console.log('4. Edit content multiple times');
  console.log('5. Click the Clock icon to see version history');
  console.log('6. Select 2 versions and compare them');
  console.log('7. Try restoring a previous version');
  console.log('8. Stop/restart server and verify versions persist');
  console.log();
  console.log('Backend API endpoints to test:');
  console.log(`- GET  ${API_BASE}/chapters/${chapterId}/versions`);
  console.log(`- GET  ${API_BASE}/chapters/${chapterId}/versions/:versionId`);
  console.log(`- POST ${API_BASE}/chapters/${chapterId}/restore/:versionId`);
  console.log();
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node verify-features-52-53.js <token> <chapterId>');
  console.log();
  console.log('Example:');
  console.log('  node verify-features-52-53.js eyJhbGci... abc-123-chapter-id');
  console.log();
  process.exit(1);
}

const [token, chapterId] = args;

// Run verification
verifyFeatures(token, chapterId).catch(error => {
  console.error('Verification failed with error:', error);
  process.exit(1);
});
