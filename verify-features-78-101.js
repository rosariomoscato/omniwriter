/**
 * Verification Script for Features #78 and #101
 *
 * Feature #78: Feature gating for free users
 * Feature #101: User data isolation between accounts
 */

const axios = require('axios');
const crypto = require('crypto');

const API_BASE = 'http://localhost:8080/api';

// Helper to generate unique test data
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Helper to create test users
async function createTestUser(roleOverride = null) {
  const uniqueId = generateUniqueId();
  const email = `test_${uniqueId}@example.com`;
  const password = 'Test123456';

  // Register user
  const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
    email,
    password,
    name: `Test User ${uniqueId}`
  });

  const { token, user } = registerResponse.data;

  // If role override is needed (for testing premium), update directly in DB
  // Note: In real scenarios, this would be done through subscription flow
  if (roleOverride && user.role !== roleOverride) {
    console.log(`  Note: User created as '${user.role}', need to manually update DB for '${roleOverride}'`);
  }

  return { email, password, token, user };
}

// Helper to create test project
async function createTestProject(token, title) {
  const response = await axios.post(`${API_BASE}/projects`, {
    title,
    description: 'Test project for verification',
    area: 'romanziere'
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data.project;
}

// ============================
// FEATURE #78: Feature Gating
// ============================
console.log('\n========================================');
console.log('FEATURE #78: Feature Gating for Free Users');
console.log('========================================\n');

async function testFeatureGating() {
  console.log('Step 1: Create free user and login...');
  const freeUser = await createTestUser();
  console.log(`  ✅ Created free user: ${freeUser.user.email} (role: ${freeUser.user.role})`);

  console.log('\nStep 2: Try to access sagas (premium feature)...');
  try {
    await axios.get(`${API_BASE}/sagas`, {
      headers: { Authorization: `Bearer ${freeUser.token}` }
    });
    console.log('  ❌ FAILED: Free user accessed sagas (should be blocked)');
    return false;
  } catch (error) {
    if (error.response?.status === 403 && error.response?.data?.code === 'PREMIUM_REQUIRED') {
      console.log('  ✅ PASSED: Free user blocked from sagas');
      console.log(`     Error message: "${error.response.data.message}"`);
    } else {
      console.log(`  ❌ FAILED: Wrong error - Status: ${error.response?.status}`);
      return false;
    }
  }

  console.log('\nStep 3: Try to create saga (premium feature)...');
  try {
    await axios.post(`${API_BASE}/sagas`, {
      title: 'Test Saga',
      description: 'Test description',
      area: 'romanziere'
    }, {
      headers: { Authorization: `Bearer ${freeUser.token}` }
    });
    console.log('  ❌ FAILED: Free user created saga (should be blocked)');
    return false;
  } catch (error) {
    if (error.response?.status === 403 && error.response?.data?.code === 'PREMIUM_REQUIRED') {
      console.log('  ✅ PASSED: Free user blocked from creating sagas');
    } else {
      console.log(`  ❌ FAILED: Wrong error - Status: ${error.response?.status}`);
      return false;
    }
  }

  console.log('\nStep 4: Try to export to EPUB format (premium)...');
  // First create a project
  const project = await createTestProject(freeUser.token, 'Free User Test Project');
  console.log(`  Created project ${project.id} for export test`);

  try {
    await axios.post(`${API_BASE}/projects/${project.id}/export`, {
      format: 'epub'
    }, {
      headers: { Authorization: `Bearer ${freeUser.token}` }
    });
    console.log('  ❌ FAILED: Free user exported to EPUB (should be blocked)');
    return false;
  } catch (error) {
    if (error.response?.status === 403 && error.response?.data?.code === 'PREMIUM_REQUIRED') {
      console.log('  ✅ PASSED: Free user blocked from EPUB export');
      console.log(`     Error message: "${error.response.data.message}"`);
    } else {
      console.log(`  ❌ FAILED: Wrong error - Status: ${error.response?.status}`);
      console.log(`     Response: ${JSON.stringify(error.response?.data)}`);
      return false;
    }
  }

  console.log('\nStep 5: Try to export to PDF format (premium)...');
  try {
    await axios.post(`${API_BASE}/projects/${project.id}/export`, {
      format: 'pdf'
    }, {
      headers: { Authorization: `Bearer ${freeUser.token}` }
    });
    console.log('  ❌ FAILED: Free user exported to PDF (should be blocked)');
    return false;
  } catch (error) {
    if (error.response?.status === 403 && error.response?.data?.code === 'PREMIUM_REQUIRED') {
      console.log('  ✅ PASSED: Free user blocked from PDF export');
      console.log(`     Error message: "${error.response.data.message}"`);
    } else {
      console.log(`  ❌ FAILED: Wrong error - Status: ${error.response?.status}`);
      return false;
    }
  }

  console.log('\nStep 6: Verify TXT export still works (free feature)...');
  try {
    await axios.post(`${API_BASE}/projects/${project.id}/export`, {
      format: 'txt'
    }, {
      headers: { Authorization: `Bearer ${freeUser.token}` },
      responseType: 'arraybuffer'
    });
    console.log('  ✅ PASSED: Free user can export to TXT');
  } catch (error) {
    console.log(`  ❌ FAILED: TXT export should work - ${error.message}`);
    return false;
  }

  console.log('\nStep 7: Verify DOCX export still works (free feature)...');
  try {
    await axios.post(`${API_BASE}/projects/${project.id}/export`, {
      format: 'docx'
    }, {
      headers: { Authorization: `Bearer ${freeUser.token}` },
      responseType: 'arraybuffer'
    });
    console.log('  ✅ PASSED: Free user can export to DOCX');
  } catch (error) {
    console.log(`  ❌ FAILED: DOCX export should work - ${error.message}`);
    return false;
  }

  return true;
}

// ============================
// FEATURE #101: User Data Isolation
// ============================
console.log('\n========================================');
console.log('FEATURE #101: User Data Isolation');
console.log('========================================\n');

async function testUserDataIsolation() {
  console.log('Step 1: Create User A...');
  const userA = await createTestUser();
  console.log(`  ✅ Created User A: ${userA.user.email} (ID: ${userA.user.id})`);

  console.log('\nStep 2: Create User B...');
  const userB = await createTestUser();
  console.log(`  ✅ Created User B: ${userB.user.email} (ID: ${userB.user.id})`);

  console.log('\nStep 3: User A creates a project...');
  const projectA = await createTestProject(userA.token, 'User A Project');
  console.log(`  ✅ User A created project: ${projectA.id}`);

  console.log('\nStep 4: User B lists projects (should not see User A\'s project)...');
  try {
    const userBProjects = await axios.get(`${API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${userB.token}` }
    });
    const hasProjectA = userBProjects.data.projects.some(p => p.id === projectA.id);
    if (hasProjectA) {
      console.log('  ❌ FAILED: User B can see User A\'s project!');
      return false;
    }
    console.log(`  ✅ PASSED: User B sees only their projects (count: ${userBProjects.data.count})`);
  } catch (error) {
    console.log(`  ❌ FAILED: Error listing projects - ${error.message}`);
    return false;
  }

  console.log('\nStep 5: User B tries to access User A\'s project directly by ID...');
  try {
    await axios.get(`${API_BASE}/projects/${projectA.id}`, {
      headers: { Authorization: `Bearer ${userB.token}` }
    });
    console.log('  ❌ FAILED: User B accessed User A\'s project directly!');
    return false;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('  ✅ PASSED: User B got 404 when accessing User A\'s project');
    } else if (error.response?.status === 403) {
      console.log('  ✅ PASSED: User B got 403 when accessing User A\'s project');
    } else {
      console.log(`  ❌ FAILED: Wrong error status - ${error.response?.status}`);
      return false;
    }
  }

  console.log('\nStep 6: User B tries to update User A\'s project...');
  try {
    await axios.put(`${API_BASE}/projects/${projectA.id}`, {
      title: 'Hacked Project'
    }, {
      headers: { Authorization: `Bearer ${userB.token}` }
    });
    console.log('  ❌ FAILED: User B updated User A\'s project!');
    return false;
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 403) {
      console.log('  ✅ PASSED: User B blocked from updating User A\'s project');
    } else {
      console.log(`  ❌ FAILED: Wrong error status - ${error.response?.status}`);
      return false;
    }
  }

  console.log('\nStep 7: User B tries to delete User A\'s project...');
  try {
    await axios.delete(`${API_BASE}/projects/${projectA.id}`, {
      headers: { Authorization: `Bearer ${userB.token}` }
    });
    console.log('  ❌ FAILED: User B deleted User A\'s project!');
    return false;
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 403) {
      console.log('  ✅ PASSED: User B blocked from deleting User A\'s project');
    } else {
      console.log(`  ❌ FAILED: Wrong error status - ${error.response?.status}`);
      return false;
    }
  }

  console.log('\nStep 8: User A creates a chapter...');
  const chapterA = await axios.post(`${API_BASE}/projects/${projectA.id}/chapters`, {
    title: 'Chapter 1'
  }, {
    headers: { Authorization: `Bearer ${userA.token}` }
  });
  const chapterId = chapterA.data.chapter.id;
  console.log(`  ✅ User A created chapter: ${chapterId}`);

  console.log('\nStep 9: User B tries to access User A\'s chapter...');
  try {
    await axios.get(`${API_BASE}/chapters/${chapterId}`, {
      headers: { Authorization: `Bearer ${userB.token}` }
    });
    console.log('  ❌ FAILED: User B accessed User A\'s chapter!');
    return false;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('  ✅ PASSED: User B got 404 when accessing User A\'s chapter');
    } else {
      console.log(`  ❌ FAILED: Wrong error status - ${error.response?.status}`);
      return false;
    }
  }

  console.log('\nStep 10: User A verifies their project still exists...');
  try {
    const userAProjects = await axios.get(`${API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${userA.token}` }
    });
    const projectStillExists = userAProjects.data.projects.some(p => p.id === projectA.id);
    if (!projectStillExists) {
      console.log('  ❌ FAILED: User A\'s project disappeared!');
      return false;
    }
    console.log('  ✅ PASSED: User A\'s project still intact');
  } catch (error) {
    console.log(`  ❌ FAILED: Error verifying - ${error.message}`);
    return false;
  }

  return true;
}

// Run tests
(async () => {
  try {
    const feature78Result = await testFeatureGating();
    console.log('\n' + '='.repeat(50));
    console.log(`FEATURE #78 RESULT: ${feature78Result ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(50));

    const feature101Result = await testUserDataIsolation();
    console.log('\n' + '='.repeat(50));
    console.log(`FEATURE #101 RESULT: ${feature101Result ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(50));

    if (feature78Result && feature101Result) {
      console.log('\n🎉 ALL TESTS PASSED! 🎉\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  SOME TESTS FAILED ⚠️\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ TEST SCRIPT ERROR:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
})();
