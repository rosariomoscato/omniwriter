// Test database persistence for Feature #2
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath);

console.log('=== Feature #2: Database Persistence Test ===\n');

// Create unique test data
const testUserId = 'TEST_PERSISTENCE_' + uuidv4().substring(0, 8);
const testEmail = `test_persistence_${Date.now()}@example.com`;

console.log(`Creating test user: ${testEmail}`);

try {
  // Insert test user
  const insertResult = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
    VALUES (?, ?, 'test_hash', 'Persistence Test User', 'user', datetime('now'), datetime('now'))
  `).run(testUserId, testEmail);

  console.log(`✅ Test user created with ID: ${testUserId}`);

  // Verify it exists
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(testUserId);
  if (user) {
    console.log('✅ Test user verified in database');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);
  } else {
    console.log('❌ Failed to verify test user');
    process.exit(1);
  }

  // Test data in other tables
  const testProjectId = 'TEST_PROJECT_' + uuidv4().substring(0, 8);
  console.log(`\nCreating test project: ${testProjectId}`);

  db.prepare(`
    INSERT INTO projects (id, user_id, title, area, status, created_at, updated_at)
    VALUES (?, ?, 'Persistence Test Project', 'romanziere', 'draft', datetime('now'), datetime('now'))
  `).run(testProjectId, testUserId);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(testProjectId);
  if (project) {
    console.log('✅ Test project verified in database');
    console.log(`   Title: ${project.title}`);
    console.log(`   User ID: ${project.user_id}`);
    console.log(`   Area: ${project.area}`);
    console.log(`   Status: ${project.status}`);
  } else {
    console.log('❌ Failed to verify test project');
    process.exit(1);
  }

  // Test chapter
  const testChapterId = 'TEST_CHAPTER_' + uuidv4().substring(0, 8);
  console.log(`\nCreating test chapter: ${testChapterId}`);

  db.prepare(`
    INSERT INTO chapters (id, project_id, title, content, order_index, status, created_at, updated_at)
    VALUES (?, ?, 'Test Chapter', 'Test content', 1, 'draft', datetime('now'), datetime('now'))
  `).run(testChapterId, testProjectId);

  const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(testChapterId);
  if (chapter) {
    console.log('✅ Test chapter verified in database');
    console.log(`   Title: ${chapter.title}`);
    console.log(`   Project ID: ${chapter.project_id}`);
    console.log(`   Order Index: ${chapter.order_index}`);
  } else {
    console.log('❌ Failed to verify test chapter');
    process.exit(1);
  }

  console.log('\n✅ All test data successfully created and verified');
  console.log('   Data persistence test: PASSED');

  // Test foreign key integrity
  console.log('\n=== Testing Foreign Key Constraints ===');

  // Try to insert a chapter with invalid project_id (should fail)
  try {
    db.prepare(`
      INSERT INTO chapters (id, project_id, title, content, order_index, status, created_at, updated_at)
      VALUES ('INVALID_CHAPTER', 'INVALID_PROJECT', 'Bad Chapter', 'Bad content', 1, 'draft', datetime('now'), datetime('now'))
    `).run();
    console.log('❌ Foreign key constraint NOT working - invalid insert succeeded');
    process.exit(1);
  } catch (fkError) {
    console.log('✅ Foreign key constraint working - invalid insert blocked');
  }

  // Test data retrieval with JOINs
  console.log('\n=== Testing Data Retrieval ===');
  const joinedData = db.prepare(`
    SELECT
      u.email,
      p.title as project_title,
      c.title as chapter_title
    FROM users u
    JOIN projects p ON u.id = p.user_id
    JOIN chapters c ON p.id = c.project_id
    WHERE u.id = ?
  `).get(testUserId);

  if (joinedData) {
    console.log('✅ JOIN query successful');
    console.log(`   User: ${joinedData.email}`);
    console.log(`   Project: ${joinedData.project_title}`);
    console.log(`   Chapter: ${joinedData.chapter_title}`);
  }

  console.log('\n=== All Persistence Tests PASSED ===\n');

  // Cleanup
  console.log('Cleaning up test data...');
  db.prepare('DELETE FROM chapters WHERE id = ?').run(testChapterId);
  db.prepare('DELETE FROM projects WHERE id = ?').run(testProjectId);
  db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  console.log('✅ Test data cleaned up');

  db.close();
  process.exit(0);

} catch (error) {
  console.error('❌ Test failed:', error.message);
  db.close();
  process.exit(1);
}
