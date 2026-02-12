/**
 * Verification Script for Features #94 and #135
 *
 * Feature #94: Generation log records all generations
 * Feature #135: Multiple style profiles per user
 *
 * Run this after servers are running:
 * node verify-features-94-135.js <token>
 */

const API_BASE = 'http://localhost:5000/api';

async function verifyFeature135() {
  console.log('\n=== Feature #135: Multiple Style Profiles Per User ===\n');

  const token = process.argv[2];
  if (!token) {
    console.error('Usage: node verify-features-94-135.js <token>');
    process.exit(1);
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    // Step 1: Create profile A
    console.log('Step 1: Creating profile A...');
    const profileARes = await fetch(`${API_BASE}/human-models`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: `TEST_PROFILE_A_${Date.now()}`,
        description: 'Test profile A for feature 135',
        model_type: 'saggista_basic',
        style_strength: 60,
      }),
    });
    const profileA = await profileARes.json();
    console.log('✓ Profile A created:', profileA.model.id);

    // Step 2: Create profile B
    console.log('\nStep 2: Creating profile B...');
    const profileBRes = await fetch(`${API_BASE}/human-models`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: `TEST_PROFILE_B_${Date.now()}`,
        description: 'Test profile B for feature 135',
        model_type: 'redattore_basic',
        style_strength: 80,
      }),
    });
    const profileB = await profileBRes.json();
    console.log('✓ Profile B created:', profileB.model.id);

    // Step 3: Verify both in list
    console.log('\nStep 3: Fetching all profiles...');
    const listRes = await fetch(`${API_BASE}/human-models`, {
      headers,
    });
    const { models } = await listRes.json();
    console.log(`✓ Found ${models.length} total profiles`);

    const hasProfileA = models.some((m: any) => m.id === profileA.model.id);
    const hasProfileB = models.some((m: any) => m.id === profileB.model.id);

    if (hasProfileA && hasProfileB) {
      console.log('✓ Both profiles appear in the list');
    } else {
      console.error('✗ One or both profiles missing from list');
      return false;
    }

    // Step 4: Verify each has separate settings
    console.log('\nStep 4: Verifying separate settings...');
    const profileAFull = models.find((m: any) => m.id === profileA.model.id);
    const profileBFull = models.find((m: any) => m.id === profileB.model.id);

    if (profileAFull.model_type === 'saggista_basic' && profileAFull.style_strength === 60) {
      console.log('✓ Profile A has correct settings (saggista_basic, 60%)');
    } else {
      console.error('✗ Profile A settings incorrect');
      return false;
    }

    if (profileBFull.model_type === 'redattore_basic' && profileBFull.style_strength === 80) {
      console.log('✓ Profile B has correct settings (redattore_basic, 80%)');
    } else {
      console.error('✗ Profile B settings incorrect');
      return false;
    }

    // Step 5: Delete one - verify other remains
    console.log('\nStep 5: Deleting profile A...');
    await fetch(`${API_BASE}/human-models/${profileA.model.id}`, {
      method: 'DELETE',
      headers,
    });
    console.log('✓ Profile A deleted');

    console.log('\nStep 6: Verifying profile B still exists...');
    const listRes2 = await fetch(`${API_BASE}/human-models`, {
      headers,
    });
    const { models: modelsAfterDelete } = await listRes2.json();

    const hasProfileBAfterDelete = modelsAfterDelete.some((m: any) => m.id === profileB.model.id);
    const hasProfileAAfterDelete = modelsAfterDelete.some((m: any) => m.id === profileA.model.id);

    if (hasProfileBAfterDelete && !hasProfileAAfterDelete) {
      console.log('✓ Profile B remains, Profile A is deleted');
    } else {
      console.error('✗ Delete verification failed');
      return false;
    }

    // Cleanup: Delete profile B
    console.log('\nCleanup: Deleting profile B...');
    await fetch(`${API_BASE}/human-models/${profileB.model.id}`, {
      method: 'DELETE',
      headers,
    });
    console.log('✓ Profile B deleted');

    console.log('\n✅ Feature #135: PASS - Multiple style profiles work correctly\n');
    return true;

  } catch (error) {
    console.error('\n❌ Feature #135: FAIL -', error.message);
    return false;
  }
}

async function verifyFeature94() {
  console.log('\n=== Feature #94: Generation Log Records All Generations ===\n');

  const token = process.argv[2];
  if (!token) {
    console.error('Usage: node verify-features-94-135.js <token>');
    process.exit(1);
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    // First, get a project ID (create one if needed)
    console.log('Step 1: Getting/creating a test project...');
    const projectsRes = await fetch(`${API_BASE}/projects`, {
      headers,
    });
    const { projects } = await projectsRes.json();

    let testProjectId;
    if (projects.length > 0) {
      testProjectId = projects[0].id;
      console.log('✓ Using existing project:', testProjectId);
    } else {
      const createRes = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: `TEST_PROJECT_GEN_LOG_${Date.now()}`,
          description: 'Test project for generation logs',
          area: 'saggista',
        }),
      });
      const created = await createRes.json();
      testProjectId = created.project.id;
      console.log('✓ Created test project:', testProjectId);
    }

    // Step 2: Create generation logs with different phases
    console.log('\nStep 2: Creating generation log entry (phase: structure)...');
    const log1Res = await fetch(`${API_BASE}/generation-logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        project_id: testProjectId,
        model_used: 'gpt-4',
        phase: 'structure',
        tokens_input: 100,
        tokens_output: 500,
        duration_ms: 2500,
        status: 'completed',
      }),
    });
    const log1 = await log1Res.json();
    console.log('✓ Generation log created (structure):', log1.log.id);

    console.log('\nStep 3: Creating generation log entry (phase: writing)...');
    const log2Res = await fetch(`${API_BASE}/generation-logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        project_id: testProjectId,
        model_used: 'gpt-4',
        phase: 'writing',
        tokens_input: 500,
        tokens_output: 2000,
        duration_ms: 15000,
        status: 'completed',
      }),
    });
    const log2 = await log2Res.json();
    console.log('✓ Generation log created (writing):', log2.log.id);

    // Step 3: View generation logs
    console.log('\nStep 4: Fetching generation logs for project...');
    const logsRes = await fetch(`${API_BASE}/projects/${testProjectId}/generation-logs`, {
      headers,
    });
    const { logs, count } = await logsRes.json();
    console.log(`✓ Found ${count} generation logs`);

    if (count >= 2) {
      console.log('✓ Multiple generation logs recorded');
    } else {
      console.error('✗ Expected at least 2 generation logs');
      return false;
    }

    // Step 4: Verify log details
    console.log('\nStep 5: Verifying log details...');
    const hasStructureLog = logs.some((l: any) => l.phase === 'structure' && l.status === 'completed');
    const hasWritingLog = logs.some((l: any) => l.phase === 'writing' && l.status === 'completed');

    if (hasStructureLog) {
      console.log('✓ Structure log found with correct details');
    } else {
      console.error('✗ Structure log missing or incorrect');
      return false;
    }

    if (hasWritingLog) {
      console.log('✓ Writing log found with correct details');
    } else {
      console.error('✗ Writing log missing or incorrect');
      return false;
    }

    // Step 5: Verify persistence (refresh and check again)
    console.log('\nStep 6: Verifying persistence...');
    const logsRes2 = await fetch(`${API_BASE}/projects/${testProjectId}/generation-logs`, {
      headers,
    });
    const { logs: logsAfterRefresh } = await logsRes2.json();

    if (logsAfterRefresh.length >= 2) {
      console.log('✓ Generation logs persist after refresh');
    } else {
      console.error('✗ Generation logs do not persist');
      return false;
    }

    // Cleanup: Delete test logs (would need cascade delete in DB)
    console.log('\nNote: Test logs left in database for manual verification');

    console.log('\n✅ Feature #94: PASS - Generation logs work correctly\n');
    return true;

  } catch (error) {
    console.error('\n❌ Feature #94: FAIL -', error.message);
    return false;
  }
}

// Run both verifications
(async () => {
  console.log('========================================');
  console.log('Features #94 and #135 Verification');
  console.log('========================================');

  const result135 = await verifyFeature135();
  const result94 = await verifyFeature94();

  console.log('========================================');
  console.log('Summary:');
  console.log(`Feature #94 (Generation Logs): ${result94 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Feature #135 (Multiple Profiles): ${result135 ? '✅ PASS' : '❌ FAIL'}`);
  console.log('========================================\n');
})();
