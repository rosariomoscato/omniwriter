#!/usr/bin/env node

/**
 * Feature #303 Test Script: Create Sequel with Continuity
 *
 * This script tests the saga-level sequel creation endpoint
 */

const http = require('http');

const API_BASE = 'http://localhost:5001/api';

// Test user credentials (you may need to create these first)
const testUser = {
  email: `test-feature-303-${Date.now()}@example.com`,
  password: 'Test1234!',
  name: 'Feature 303 Test User'
};

let authToken = null;
let userId = null;
let sagaId = null;
let project1Id = null;
let project2Id = null;
let sequelProjectId = null;

function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Feature #303 Test: Create Sequel with Saga Continuity\n');

  try {
    // Step 1: Register test user
    console.log('1️⃣  Registering test user...');
    const registerRes = await makeRequest('/auth/register', 'POST', testUser);
    if (registerRes.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(registerRes.data)}`);
    }
    authToken = registerRes.data.token;
    userId = registerRes.data.user.id;
    console.log('✅ User registered:', testUser.email);

    // Step 2: Create a saga
    console.log('\n2️⃣  Creating saga...');
    const sagaRes = await makeRequest('/sagas', 'POST', {
      title: 'Test Saga for Sequel',
      description: 'Testing saga continuity sequel creation',
      area: 'romanziere'
    }, { Authorization: `Bearer ${authToken}` });

    if (sagaRes.status !== 201) {
      throw new Error(`Saga creation failed: ${JSON.stringify(sagaRes.data)}`);
    }
    sagaId = sagaRes.data.saga.id;
    console.log('✅ Saga created:', sagaRes.data.saga.title);

    // Step 3: Create first project in saga
    console.log('\n3️⃣  Creating first project...');
    const project1Res = await makeRequest('/projects', 'POST', {
      title: 'Episode 1: The Beginning',
      description: 'First episode of our saga',
      area: 'romanziere',
      genre: 'Fantasy',
      tone: 'Epic',
      saga_id: sagaId
    }, { Authorization: `Bearer ${authToken}` });

    if (project1Res.status !== 201) {
      throw new Error(`Project 1 creation failed: ${JSON.stringify(project1Res.data)}`);
    }
    project1Id = project1Res.data.project.id;
    console.log('✅ Project 1 created:', project1Res.data.project.title);

    // Step 4: Add some characters to project 1
    console.log('\n4️⃣  Adding characters to project 1...');
    await makeRequest(`/projects/${project1Id}/characters`, 'POST', {
      name: 'Hero Anderson',
      description: 'The brave protagonist',
      role: 'protagonist'
    }, { Authorization: `Bearer ${authToken}` });

    await makeRequest(`/projects/${project1Id}/characters`, 'POST', {
      name: 'Villain Vile',
      description: 'The evil antagonist',
      role: 'antagonist'
    }, { Authorization: `Bearer ${authToken}` });

    await makeRequest(`/projects/${project1Id}/characters`, 'POST', {
      name: 'Mentor Wiseman',
      description: 'The wise old guide',
      role: 'mentor',
      status_at_end: 'dead' // This character should NOT be copied to sequel
    }, { Authorization: `Bearer ${authToken}` });

    console.log('✅ Characters added (including one dead)');

    // Step 5: Add locations to project 1
    console.log('\n5️⃣  Adding locations to project 1...');
    await makeRequest(`/projects/${project1Id}/locations`, 'POST', {
      name: 'Castle Hero',
      description: 'The home of our hero'
    }, { Authorization: `Bearer ${authToken}` });

    await makeRequest(`/projects/${project1Id}/locations`, 'POST', {
      name: 'Dark Forest',
      description: 'A dangerous place'
    }, { Authorization: `Bearer ${authToken}` });

    console.log('✅ Locations added');

    // Step 6: Create second project in saga
    console.log('\n6️⃣  Creating second project...');
    const project2Res = await makeRequest('/projects', 'POST', {
      title: 'Episode 2: The Journey',
      description: 'Second episode of our saga',
      area: 'romanziere',
      genre: 'Fantasy',
      tone: 'Epic',
      saga_id: sagaId
    }, { Authorization: `Bearer ${authToken}` });

    if (project2Res.status !== 201) {
      throw new Error(`Project 2 creation failed: ${JSON.stringify(project2Res.data)}`);
    }
    project2Id = project2Res.data.project.id;
    console.log('✅ Project 2 created:', project2Res.data.project.title);

    // Step 7: TEST THE FEATURE - Create sequel using saga endpoint
    console.log('\n7️⃣  TESTING FEATURE: Create sequel via saga endpoint...');
    const sequelRes = await makeRequest(`/sagas/${sagaId}/create-sequel`, 'POST', {
      title: 'Episode 3: The Sequel',
      description: 'Created with saga continuity',
      source_project_id: project1Id // Use project 1 as source
    }, { Authorization: `Bearer ${authToken}` });

    if (sequelRes.status !== 201) {
      throw new Error(`Sequel creation failed: ${JSON.stringify(sequelRes.data)}`);
    }

    sequelProjectId = sequelRes.data.project.id;
    console.log('✅ Sequel project created:', sequelRes.data.project.title);

    // Step 8: Verify sequel has characters (excluding dead ones)
    console.log('\n8️⃣  Verifying characters copied to sequel...');
    const charactersRes = await makeRequest(`/projects/${sequelProjectId}/characters`, 'GET', null, {
      Authorization: `Bearer ${authToken}`
    });

    if (charactersRes.status !== 200) {
      throw new Error(`Failed to fetch sequel characters: ${JSON.stringify(charactersRes.data)}`);
    }

    const characters = charactersRes.data.characters || [];
    console.log(`✅ Found ${characters.length} characters in sequel:`);
    characters.forEach(char => {
      console.log(`   - ${char.name} (${char.role_in_story || 'no role'})`);
    });

    // Verify we have Hero and Villain but NOT Mentor Wiseman (dead)
    const hero = characters.find(c => c.name === 'Hero Anderson');
    const villain = characters.find(c => c.name === 'Villain Vile');
    const mentor = characters.find(c => c.name === 'Mentor Wiseman');

    if (!hero) {
      throw new Error('❌ Hero Anderson was not copied to sequel!');
    }
    if (!villain) {
      throw new Error('❌ Villain Vile was not copied to sequel!');
    }
    if (mentor) {
      throw new Error('❌ Mentor Wiseman (dead) should NOT have been copied to sequel!');
    }

    console.log('✅ Dead character was correctly excluded!');
    console.log('✅ Alive characters were correctly copied!');

    // Step 9: Verify sequel has locations
    console.log('\n9️⃣  Verifying locations copied to sequel...');
    const locationsRes = await makeRequest(`/projects/${sequelProjectId}/locations`, 'GET', null, {
      Authorization: `Bearer ${authToken}`
    });

    if (locationsRes.status !== 200) {
      throw new Error(`Failed to fetch sequel locations: ${JSON.stringify(locationsRes.data)}`);
    }

    const locations = locationsRes.data.locations || [];
    console.log(`✅ Found ${locations.length} locations in sequel:`);
    locations.forEach(loc => {
      console.log(`   - ${loc.name}`);
    });

    if (locations.length < 2) {
      throw new Error('❌ Not all locations were copied to sequel!');
    }

    console.log('✅ All locations were correctly copied!');

    // Step 10: Verify sequel is linked to saga
    console.log('\n🔟 Verifying sequel is linked to saga...');
    const projectRes = await makeRequest(`/projects/${sequelProjectId}`, 'GET', null, {
      Authorization: `Bearer ${authToken}`
    });

    if (projectRes.status !== 200) {
      throw new Error(`Failed to fetch sequel project: ${JSON.stringify(projectRes.data)}`);
    }

    if (projectRes.data.project.saga_id !== sagaId) {
      throw new Error('❌ Sequel is not linked to the correct saga!');
    }

    console.log('✅ Sequel is correctly linked to saga!');

    // TEST SUMMARY
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS PASSED! Feature #303 is working correctly!');
    console.log('='.repeat(60));
    console.log('\n✅ Saga creation works');
    console.log('✅ Project creation within saga works');
    console.log('✅ Character and location management works');
    console.log('✅ Create sequel endpoint works');
    console.log('✅ Dead characters are excluded from sequel');
    console.log('✅ Alive characters are copied to sequel');
    console.log('✅ Locations are copied to sequel');
    console.log('✅ Sequel is linked to saga');
    console.log('\n📊 Test Summary:');
    console.log(`   - Saga ID: ${sagaId}`);
    console.log(`   - Project 1: ${project1Id}`);
    console.log(`   - Project 2: ${project2Id}`);
    console.log(`   - Sequel Project: ${sequelProjectId}`);
    console.log(`   - Characters copied: ${characters.length} (dead excluded)`);
    console.log(`   - Locations copied: ${locations.length}`);
    console.log('\n✨ Feature #303: Create Sequel with Continuity - VERIFIED! ✨\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run the tests
runTests();
