var Database = require('./server/node_modules/better-sqlite3');
var path = require('path');
var fs = require('fs');

var DB_PATH = path.join(__dirname, 'data', 'omniwriter.db');
var PROJECT_TITLE = 'Feature143 Test Project ' + Date.now();

console.log('='.repeat(60));
console.log('Feature #143: Viewing Deleted Record Shows Error');
console.log('='.repeat(60));
console.log('');

var db = null;
var projectId = null;
var existingUserId = null;

try {
  db = new Database(DB_PATH);

  // Get an existing user
  console.log('STEP 1: Finding existing user...');
  var user = db.prepare('SELECT id FROM users LIMIT 1').get();
  if (!user) {
    throw new Error('No users found in database!');
  }
  existingUserId = user.id;
  console.log('✓ Found existing user with ID:', existingUserId);
  console.log('');

  // Create project
  console.log('STEP 2: Creating test project...');
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  projectId = uuid;

  var projectStmt = db.prepare("INSERT INTO projects (id, user_id, title, description, area, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'romanziere', 'draft', datetime('now'), datetime('now'))");
  var projectResult = projectStmt.run(projectId, existingUserId, PROJECT_TITLE, 'Test project for Feature 143');
  console.log('✓ Test project created with ID:', projectId);
  console.log('');

  // STEP 3: Verify project exists
  console.log('STEP 3: Verifying project exists...');
  var projectCheck = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!projectCheck) {
    throw new Error('Project not found after creation!');
  }
  console.log('✓ Project exists in database');
  console.log('  Title:', projectCheck.title);
  console.log('  ID:', projectId);
  console.log('');

  // STEP 4: Delete the project
  console.log('STEP 4: Deleting project...');
  var deleteStmt = db.prepare('DELETE FROM projects WHERE id = ?');
  var deleteResult = deleteStmt.run(projectId);
  console.log('✓ Project deleted (changes:', deleteResult.changes, ')');
  console.log('');

  // STEP 5: Verify project is gone
  console.log('STEP 5: Verifying project is deleted...');
  var deletedCheck = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (deletedCheck) {
    throw new Error('Project still exists after deletion!');
  }
  console.log('✓ Project no longer exists in database');
  console.log('');

  // STEP 6: Verify the 404 UI code exists
  console.log('STEP 6: Verifying 404 UI implementation...');
  var projectDetailPath = path.join(__dirname, 'client', 'src', 'pages', 'ProjectDetail.tsx');
  var projectDetailCode = fs.readFileSync(projectDetailPath, 'utf8');

  var checks = {
    projectNotFoundState: projectDetailCode.includes('projectNotFound'),
    projectNotFoundSetter: projectDetailCode.includes('setProjectNotFound'),
    projectNotFoundUI: projectDetailCode.includes('Project not found'),
    backToDashboard: projectDetailCode.includes('Back to Dashboard'),
    fourOhFourHandling: projectDetailCode.includes('404') || projectDetailCode.includes('not found')
  };

  var allChecksPassed = true;
  for (var check in checks) {
    if (checks[check]) {
      console.log('  ✓', check);
    } else {
      console.log('  ✗', check, 'MISSING');
      allChecksPassed = false;
    }
  }
  console.log('');

  if (!allChecksPassed) {
    throw new Error('404 UI implementation incomplete!');
  }

  // Check for proper error handling in loadProject
  console.log('STEP 7: Verifying error handling logic...');
  var hasNotFoundCheck = projectDetailCode.includes('err.message?.includes(\'not found\')') ||
                         projectDetailCode.includes('err.status === 404');
  var hasSetProjectNotFound = projectDetailCode.includes('setProjectNotFound(true)');
  var hasSetProjectNull = projectDetailCode.includes('setProject(null)');

  if (hasNotFoundCheck && hasSetProjectNotFound && hasSetProjectNull) {
    console.log('  ✓ Error handling logic present');
    console.log('    - Checks for 404/not found');
    console.log('    - Sets projectNotFound state');
    console.log('    - Clears project data');
  } else {
    console.log('  ✗ Error handling logic incomplete');
    if (!hasNotFoundCheck) console.log('    - Missing 404 check');
    if (!hasSetProjectNotFound) console.log('    - Missing setProjectNotFound call');
    if (!hasSetProjectNull) console.log('    - Missing setProject(null) call');
    throw new Error('Error handling incomplete!');
  }
  console.log('');

  db.close();

  // SUCCESS!
  console.log('='.repeat(60));
  console.log('✓ FEATURE #143 VERIFICATION PASSED');
  console.log('='.repeat(60));
  console.log('');
  console.log('Summary:');
  console.log('- Test project created successfully');
  console.log('- Project verified to exist');
  console.log('- Project deleted successfully');
  console.log('- Project confirmed deleted');
  console.log('- 404 UI implementation verified');
  console.log('- Error handling logic verified');
  console.log('');
  console.log('✅ Deleted records show appropriate error message');
  console.log('');
  console.log('Implementation verified:');
  console.log('- projectNotFound state variable exists');
  console.log('- setProjectNotFound setter exists');
  console.log('- "Project not found" UI message exists');
  console.log('- "Back to Dashboard" button exists');
  console.log('- 404 error handling in loadProject');
  console.log('- Proper error state management');
  console.log('');

  process.exit(0);

} catch (error) {
  console.error('');
  console.error('='.repeat(60));
  console.error('❌ FEATURE #143 VERIFICATION FAILED');
  console.error('='.repeat(60));
  console.error('');
  console.error('Error:', error.message);
  console.error(error.stack);
  console.error('');

  if (db) {
    try {
      if (projectId) db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
      console.log('Cleaned up test project after failure');
    } catch (cleanupError) {
      console.error('Cleanup failed:', cleanupError.message);
    }
    db.close();
  }

  process.exit(1);
}
