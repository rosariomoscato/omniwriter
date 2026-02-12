#!/usr/bin/env node
/**
 * Verification script for features #124 and #125:
 * #124: Parent deletion cascades to children
 * #125: Deleted items removed from search results
 */

const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('='.repeat(60));
console.log('FEATURE #124: Parent deletion cascades to children');
console.log('FEATURE #125: Deleted items removed from search results');
console.log('='.repeat(60));

// Create a test user
const testUserId = uuidv4();
console.log('\n[1] Creating test user:', testUserId);
db.prepare('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)')
  .run(testUserId, 'cascade-test@example.com', 'Cascade Test User', 'hash');

// Create a test project
const testProjectId = uuidv4();
const testProjectTitle = 'CASCADE_DELETE_TEST_PROJECT_' + Date.now();
console.log('[2] Creating test project:', testProjectId, 'with title:', testProjectTitle);
db.prepare(`
  INSERT INTO projects (id, user_id, title, area, status)
  VALUES (?, ?, ?, ?, ?)
`).run(testProjectId, testUserId, testProjectTitle, 'romanziere', 'draft');

// Create chapters
const chapter1Id = uuidv4();
const chapter2Id = uuidv4();
console.log('[3] Creating 2 chapters for the project');
db.prepare(`
  INSERT INTO chapters (id, project_id, title, content, order_index)
  VALUES (?, ?, ?, ?, ?)
`).run(chapter1Id, testProjectId, 'Chapter 1', 'Content of chapter 1', 0);

db.prepare(`
  INSERT INTO chapters (id, project_id, title, content, order_index)
  VALUES (?, ?, ?, ?, ?)
`).run(chapter2Id, testProjectId, 'Chapter 2', 'Content of chapter 2', 1);

// Create chapter versions
const version1Id = uuidv4();
console.log('[4] Creating 1 chapter version');
db.prepare(`
  INSERT INTO chapter_versions (id, chapter_id, content, version_number)
  VALUES (?, ?, ?, ?)
`).run(version1Id, chapter1Id, 'Version content', 1);

// Create characters
const char1Id = uuidv4();
const char2Id = uuidv4();
console.log('[5] Creating 2 characters for the project');
db.prepare(`
  INSERT INTO characters (id, project_id, name, description)
  VALUES (?, ?, ?, ?)
`).run(char1Id, testProjectId, 'Character One', 'A brave hero');

db.prepare(`
  INSERT INTO characters (id, project_id, name, description)
  VALUES (?, ?, ?, ?)
`).run(char2Id, testProjectId, 'Character Two', 'A wise mentor');

// Create locations
const loc1Id = uuidv4();
const loc2Id = uuidv4();
console.log('[6] Creating 2 locations for the project');
db.prepare(`
  INSERT INTO locations (id, project_id, name, description)
  VALUES (?, ?, ?, ?)
`).run(loc1Id, testProjectId, 'Castle', 'A dark castle');

db.prepare(`
  INSERT INTO locations (id, project_id, name, description)
  VALUES (?, ?, ?, ?)
`).run(loc2Id, testProjectId, 'Forest', 'An enchanted forest');

// Create plot events
const event1Id = uuidv4();
console.log('[7] Creating 1 plot event for the project');
db.prepare(`
  INSERT INTO plot_events (id, project_id, title, description, order_index)
  VALUES (?, ?, ?, ?, ?)
`).run(event1Id, testProjectId, 'The Journey Begins', 'Hero leaves home', 0);

// Create sources
const source1Id = uuidv4();
console.log('[8] Creating 1 source for the project');
db.prepare(`
  INSERT INTO sources (id, project_id, user_id, file_name, file_type, source_type)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(source1Id, testProjectId, testUserId, 'reference.pdf', 'application/pdf', 'upload');

// Create tags
const tag1Id = uuidv4();
const tag2Id = uuidv4();
console.log('[9] Creating 2 tags for the project');
db.prepare(`
  INSERT INTO project_tags (id, project_id, tag_name)
  VALUES (?, ?, ?)
`).run(tag1Id, testProjectId, 'fantasy');

db.prepare(`
  INSERT INTO project_tags (id, project_id, tag_name)
  VALUES (?, ?, ?)
`).run(tag2Id, testProjectId, 'adventure');

// Create generation logs
const log1Id = uuidv4();
console.log('[10] Creating 1 generation log for the project');
db.prepare(`
  INSERT INTO generation_logs (id, project_id, model_used, phase, status)
  VALUES (?, ?, ?, ?, ?)
`).run(log1Id, testProjectId, 'gpt-4', 'writing', 'completed');

// Verify all records exist BEFORE deletion
console.log('\n' + '='.repeat(60));
console.log('BEFORE DELETION - RECORD COUNTS:');
console.log('='.repeat(60));

const beforeCounts = {
  projects: db.prepare('SELECT COUNT(*) as count FROM projects WHERE id = ?').get(testProjectId).count,
  chapters: db.prepare('SELECT COUNT(*) as count FROM chapters WHERE project_id = ?').get(testProjectId).count,
  chapter_versions: db.prepare('SELECT COUNT(*) as count FROM chapter_versions WHERE chapter_id IN (SELECT id FROM chapters WHERE project_id = ?)').get(testProjectId).count,
  characters: db.prepare('SELECT COUNT(*) as count FROM characters WHERE project_id = ?').get(testProjectId).count,
  locations: db.prepare('SELECT COUNT(*) as count FROM locations WHERE project_id = ?').get(testProjectId).count,
  plot_events: db.prepare('SELECT COUNT(*) as count FROM plot_events WHERE project_id = ?').get(testProjectId).count,
  sources: db.prepare('SELECT COUNT(*) as count FROM sources WHERE project_id = ?').get(testProjectId).count,
  project_tags: db.prepare('SELECT COUNT(*) as count FROM project_tags WHERE project_id = ?').get(testProjectId).count,
  generation_logs: db.prepare('SELECT COUNT(*) as count FROM generation_logs WHERE project_id = ?').get(testProjectId).count,
};

console.log(`Projects:        ${beforeCounts.projects}`);
console.log(`Chapters:        ${beforeCounts.chapters}`);
console.log(`Chapter Versions: ${beforeCounts.chapter_versions}`);
console.log(`Characters:       ${beforeCounts.characters}`);
console.log(`Locations:        ${beforeCounts.locations}`);
console.log(`Plot Events:      ${beforeCounts.plot_events}`);
console.log(`Sources:          ${beforeCounts.sources}`);
console.log(`Project Tags:     ${beforeCounts.project_tags}`);
console.log(`Generation Logs:   ${beforeCounts.generation_logs}`);

// Test FEATURE #125: Search finds the project
console.log('\n' + '='.repeat(60));
console.log('FEATURE #125: Testing search BEFORE deletion');
console.log('='.repeat(60));
const searchTerm = testProjectTitle.split('_').pop(); // Search by unique timestamp
console.log('Searching for:', searchTerm);

const beforeSearchResults = db.prepare(`
  SELECT * FROM projects
  WHERE user_id = ?
    AND (title LIKE ? OR description LIKE ?)
`).all(testUserId, `%${searchTerm}%`, `%${searchTerm}%`);

console.log(`Search found ${beforeSearchResults.length} project(s)`);
if (beforeSearchResults.length > 0) {
  console.log('✓ Project found in search results');
} else {
  console.log('✗ ERROR: Project NOT found in search results before deletion!');
}

// DELETE THE PROJECT
console.log('\n' + '='.repeat(60));
console.log('DELETING PROJECT:', testProjectId);
console.log('='.repeat(60));

const deleteResult = db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(testProjectId, testUserId);
console.log(`Delete result: ${deleteResult.changes} row(s) deleted`);

// Verify all records are GONE after deletion (CASCADE)
console.log('\n' + '='.repeat(60));
console.log('AFTER DELETION - RECORD COUNTS (FEATURE #124):');
console.log('='.repeat(60));

const afterCounts = {
  projects: db.prepare('SELECT COUNT(*) as count FROM projects WHERE id = ?').get(testProjectId).count,
  chapters: db.prepare('SELECT COUNT(*) as count FROM chapters WHERE project_id = ?').get(testProjectId).count,
  chapter_versions: db.prepare('SELECT COUNT(*) as count FROM chapter_versions WHERE chapter_id IN (SELECT id FROM chapters WHERE project_id = ?)').get(testProjectId).count,
  characters: db.prepare('SELECT COUNT(*) as count FROM characters WHERE project_id = ?').get(testProjectId).count,
  locations: db.prepare('SELECT COUNT(*) as count FROM locations WHERE project_id = ?').get(testProjectId).count,
  plot_events: db.prepare('SELECT COUNT(*) as count FROM plot_events WHERE project_id = ?').get(testProjectId).count,
  sources: db.prepare('SELECT COUNT(*) as count FROM sources WHERE project_id = ?').get(testProjectId).count,
  project_tags: db.prepare('SELECT COUNT(*) as count FROM project_tags WHERE project_id = ?').get(testProjectId).count,
  generation_logs: db.prepare('SELECT COUNT(*) as count FROM generation_logs WHERE project_id = ?').get(testProjectId).count,
};

console.log(`Projects:        ${afterCounts.projects} (should be 0)`);
console.log(`Chapters:        ${afterCounts.chapters} (should be 0)`);
console.log(`Chapter Versions: ${afterCounts.chapter_versions} (should be 0)`);
console.log(`Characters:       ${afterCounts.characters} (should be 0)`);
console.log(`Locations:        ${afterCounts.locations} (should be 0)`);
console.log(`Plot Events:      ${afterCounts.plot_events} (should be 0)`);
console.log(`Sources:          ${afterCounts.sources} (should be 0)`);
console.log(`Project Tags:     ${afterCounts.project_tags} (should be 0)`);
console.log(`Generation Logs:   ${afterCounts.generation_logs} (should be 0)`);

// Test FEATURE #125: Search should NOT find the deleted project
console.log('\n' + '='.repeat(60));
console.log('FEATURE #125: Testing search AFTER deletion');
console.log('='.repeat(60));

const afterSearchResults = db.prepare(`
  SELECT * FROM projects
  WHERE user_id = ?
    AND (title LIKE ? OR description LIKE ?)
`).all(testUserId, `%${searchTerm}%`, `%${searchTerm}%`);

console.log(`Search found ${afterSearchResults.length} project(s)`);
if (afterSearchResults.length === 0) {
  console.log('✓ Project correctly NOT found in search results after deletion');
} else {
  console.log('✗ ERROR: Project STILL appears in search results after deletion!');
}

// FINAL VERDICT
console.log('\n' + '='.repeat(60));
console.log('FINAL VERIFICATION RESULTS');
console.log('='.repeat(60));

const cascadeTests = [
  { name: 'Project deleted', before: beforeCounts.projects, after: afterCounts.projects, shouldBeZero: true },
  { name: 'Chapters cascade deleted', before: beforeCounts.chapters, after: afterCounts.chapters, shouldBeZero: true },
  { name: 'Chapter versions cascade deleted', before: beforeCounts.chapter_versions, after: afterCounts.chapter_versions, shouldBeZero: true },
  { name: 'Characters cascade deleted', before: beforeCounts.characters, after: afterCounts.characters, shouldBeZero: true },
  { name: 'Locations cascade deleted', before: beforeCounts.locations, after: afterCounts.locations, shouldBeZero: true },
  { name: 'Plot events cascade deleted', before: beforeCounts.plot_events, after: afterCounts.plot_events, shouldBeZero: true },
  { name: 'Sources cascade deleted', before: beforeCounts.sources, after: afterCounts.sources, shouldBeZero: true },
  { name: 'Project tags cascade deleted', before: beforeCounts.project_tags, after: afterCounts.project_tags, shouldBeZero: true },
  { name: 'Generation logs cascade deleted', before: beforeCounts.generation_logs, after: afterCounts.generation_logs, shouldBeZero: true },
];

let allPassed = true;
for (const test of cascadeTests) {
  const passed = test.after === 0 && test.before > 0;
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name} (${test.before} -> ${test.after})`);
  if (!passed) allPassed = false;
}

// Feature #125 test
const searchPass = beforeSearchResults.length > 0 && afterSearchResults.length === 0;
const searchStatus = searchPass ? '✓ PASS' : '✗ FAIL';
console.log(`${searchStatus}: Deleted items removed from search results`);
if (!searchPass) allPassed = false;

// Cleanup test data
console.log('\n' + '='.repeat(60));
console.log('CLEANUP: Removing test user and related data');
console.log('='.repeat(60));
db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
console.log('Test user deleted');

db.close();

console.log('\n' + '='.repeat(60));
if (allPassed) {
  console.log('✓✓✓ ALL TESTS PASSED ✓✓✓');
  console.log('Feature #124: Parent deletion cascades to children - PASSING');
  console.log('Feature #125: Deleted items removed from search results - PASSING');
} else {
  console.log('✗✗✗ SOME TESTS FAILED ✗✗✗');
  console.log('Check the results above to identify what failed.');
}
console.log('='.repeat(60));

process.exit(allPassed ? 0 : 1);
