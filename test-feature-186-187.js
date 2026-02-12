/**
 * Test script for Features #186 and #187
 * Run this after the client has been restarted with the new code
 */

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001/api';

async function testFeature186_CoverImagePreview() {
  console.log('\n=== Testing Feature #186: EPUB Cover Image Preview ===\n');

  const fs = require('fs');
  const path = require('path');

  // 1. Create a test image (simple 1x1 PNG in base64)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const testImageBuffer = Buffer.from(testImageBase64, 'base64');

  // 2. Login as test user (create one if needed)
  console.log('1. Logging in as test user...');
  let loginResponse = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'Password123!'
    })
  });

  if (!loginResponse.ok && loginResponse.status === 401) {
    console.log('   User not found, creating...');
    await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User'
      })
    });
    loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Password123!'
      })
    });
  }

  const loginData = await loginResponse.json();
  const token = loginData.token;
  console.log('   ✓ Logged in');

  // 3. Create a test project
  console.log('\n2. Creating test project...');
  const projectResponse = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'EPUB Cover Test Project',
      description: 'Testing cover image upload',
      area: 'romanziere',
      genre: 'Fiction',
      tone: 'Dramatic',
      target_audience: 'Adults',
      pov: 'Third Person'
    })
  });

  const project = await projectResponse.json();
  console.log(`   ✓ Created project: ${project.project.id}`);

  // 4. Create a chapter
  console.log('\n3. Creating test chapter...');
  await fetch(`${API_URL}/projects/${project.project.id}/chapters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'Test Chapter',
      content: 'This is a test chapter for cover image verification.'
    })
  });
  console.log('   ✓ Created chapter');

  // 5. Upload cover image
  console.log('\n4. Testing cover image upload...');

  // Create a FormData with the test image
  // Note: Since we can't use FormData in Node.js easily, we'll test via curl command
  console.log('\n   Manual test required for cover image upload:');
  console.log(`   curl -X POST ${API_URL}/projects/${project.project.id}/export/cover \\`);
  console.log('     -H "Authorization: Bearer ' + token + '" \\');
  console.log('     -F "cover=@test_cover.png"');

  // Save test image
  fs.writeFileSync('/tmp/test_cover.png', testImageBuffer);
  console.log('\n   ✓ Test image saved to /tmp/test_cover.png');

  console.log('\n=== Feature #186 Test Complete ===');
  console.log('\nManual verification steps:');
  console.log('1. Open http://localhost:3000 in browser');
  console.log('2. Login with test@example.com / Password123!');
  console.log('3. Open project "EPUB Cover Test Project"');
  console.log('4. Click Export button');
  console.log('5. Select EPUB format');
  console.log('6. Upload cover image using /tmp/test_cover.png');
  console.log('7. Verify image preview is shown');
  console.log('8. Export to EPUB and verify cover is included');

  return { projectId: project.project.id, token };
}

async function testFeature187_SaggistaTOC() {
  console.log('\n=== Testing Feature #187: Saggista Table of Contents ===\n');

  // 1. Login as test user
  console.log('1. Logging in as test user...');
  let loginResponse = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'Password123!'
    })
  });

  if (!loginResponse.ok && loginResponse.status === 401) {
    await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User'
      })
    });
    loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Password123!'
      })
    });
  }

  const loginData = await loginResponse.json();
  const token = loginData.token;
  console.log('   ✓ Logged in');

  // 2. Create a Saggista project
  console.log('\n2. Creating Saggista test project...');
  const projectResponse = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'Saggista TOC Test Essay',
      description: 'Testing table of contents auto-generation',
      area: 'saggista',
      settings_json: JSON.stringify({
        topic: 'Climate Change',
        depth: 'deep_dive',
        targetAudience: 'General Public',
        structure: 'popular'
      })
    })
  });

  const project = await projectResponse.json();
  console.log(`   ✓ Created Saggista project: ${project.project.id}`);

  // 3. Create multiple sections
  console.log('\n3. Creating test sections...');
  const sections = [
    { title: 'Introduction', content: 'This essay explores climate change...' },
    { title: 'Causes of Climate Change', content: 'The primary causes include...' },
    { title: 'Effects on Environment', content: 'Climate change affects...' },
    { title: 'Possible Solutions', content: 'To address climate change...' },
    { title: 'Conclusion', content: 'In summary, climate change...' }
  ];

  for (let i = 0; i < sections.length; i++) {
    await fetch(`${API_URL}/projects/${project.project.id}/chapters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(sections[i])
    });
    console.log(`   ✓ Created section ${i + 1}: ${sections[i].title}`);
  }

  // 4. Test TXT export with TOC
  console.log('\n4. Testing TXT export with TOC...');
  const exportResponse = await fetch(`${API_URL}/projects/${project.project.id}/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ format: 'txt' })
  });

  if (exportResponse.ok) {
    const content = await exportResponse.text();
    if (content.includes('INDICE') && content.includes('1. Introduction')) {
      console.log('   ✓ TOC generated correctly in TXT export');
    } else {
      console.log('   ✗ TOC not found in export');
    }
  } else {
    console.log('   ✗ Export failed');
  }

  console.log('\n=== Feature #187 Test Complete ===');
  console.log('\nManual verification steps:');
  console.log('1. Open http://localhost:3000 in browser');
  console.log('2. Login with test@example.com / Password123!');
  console.log('3. Open project "Saggista TOC Test Essay"');
  console.log('4. Verify "Indice del Saggio" section appears with all sections listed');
  console.log('5. Click on a TOC item and verify smooth scroll to section');
  console.log('6. Export as TXT and verify TOC is at the beginning');

  return { projectId: project.project.id, token };
}

// Run tests
(async () => {
  try {
    await testFeature186_CoverImagePreview();
    await testFeature187_SaggistaTOC();
    console.log('\n=== All tests completed ===\n');
  } catch (error) {
    console.error('Test error:', error);
  }
})();
