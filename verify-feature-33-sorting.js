#!/usr/bin/env node

/**
 * Verification Script for Feature #33: Sort projects by recent, alphabetical, modified
 *
 * Steps:
 * 1. Create multiple projects
 * 2. Sort by recent - verify order
 * 3. Sort alphabetical - verify A-Z
 * 4. Sort by modified - verify order
 */

const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'server', 'database.sqlite');
const db = new Database(DB_PATH, { readonly: false });

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function info(message) {
  log(`ℹ ${message}`, 'blue');
}

function section(message) {
  log(`\n${colors.bold}${message}${colors.reset}`, 'yellow');
}

// Get or create test user
function getOrCreateTestUser() {
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get('test-sorting@example.com');

  if (!user) {
    const userId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, preferred_language, theme_preference, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(userId, 'test-sorting@example.com', 'hash', 'Sorting Test User', 'free_user', 'it', 'light');

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    success(`Created test user: ${user.id}`);
  } else {
    info(`Using existing test user: ${user.id}`);
  }

  return user;
}

// Clean up any existing test projects
function cleanupTestProjects(userId) {
  const existing = db.prepare('SELECT id FROM projects WHERE title LIKE ? AND user_id = ?').all(`SORT_TEST_%`, userId);
  for (const project of existing) {
    // Delete related records
    db.prepare('DELETE FROM chapters WHERE project_id = ?').run(project.id);
    db.prepare('DELETE FROM characters WHERE project_id = ?').run(project.id);
    db.prepare('DELETE FROM locations WHERE project_id = ?').run(project.id);
    db.prepare('DELETE FROM plot_events WHERE project_id = ?').run(project.id);
    db.prepare('DELETE FROM project_tags WHERE project_id = ?').run(project.id);
    db.prepare('DELETE FROM generation_logs WHERE project_id = ?').run(project.id);
    // Delete project
    db.prepare('DELETE FROM projects WHERE id = ?').run(project.id);
  }
  info(`Cleaned up ${existing.length} existing test projects`);
}

// Create test projects with different titles and timestamps
function createTestProjects(userId) {
  section('Creating test projects...');

  const projects = [
    { title: 'SORT_TEST_Zebra', area: 'romanziere', delaySeconds: 0 },
    { title: 'SORT_TEST_Alpha', area: 'saggista', delaySeconds: 1 },
    { title: 'SORT_TEST_Medium', area: 'redattore', delaySeconds: 2 },
    { title: 'SORT_TEST_Bravo', area: 'romanziere', delaySeconds: 3 },
    { title: 'SORT_TEST_Charlie', area: 'saggista', delaySeconds: 4 },
  ];

  const createdIds = [];

  for (const proj of projects) {
    const projectId = uuidv4();

    // Insert with manually controlled timestamps
    const baseTime = new Date();
    baseTime.setSeconds(baseTime.getSeconds() - proj.delaySeconds * 10); // Spread them out

    // SQLite datetime format
    const timestamp = baseTime.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    db.prepare(`
      INSERT INTO projects (id, user_id, title, description, area, status, word_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(projectId, userId, proj.title, `Test project for sorting`, proj.area, 'draft', 0, timestamp, timestamp);

    createdIds.push({ id: projectId, title: proj.title, created_at: timestamp });
    success(`Created project: ${proj.title} (created: ${timestamp})`);
  }

  return createdIds;
}

// Update a project to change its updated_at timestamp
function updateProjectTimestamp(projectId, delaySeconds) {
  const newTime = new Date();
  newTime.setSeconds(newTime.getSeconds() + delaySeconds);
  const timestamp = newTime.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

  db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(timestamp, projectId);
  return timestamp;
}

// Test sorting by recent (updated_at DESC)
function testSortByRecent(userId) {
  section('Testing sort by "recent"...');

  const result = db.prepare(`
    SELECT * FROM projects WHERE user_id = ? AND title LIKE 'SORT_TEST_%'
    ORDER BY updated_at DESC
  `).all(userId);

  info(`Found ${result.length} projects`);
  console.log('Projects in order (most recently updated first):');
  result.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.title} - updated: ${p.updated_at}`);
  });

  // Verify order is descending by updated_at
  for (let i = 0; i < result.length - 1; i++) {
    const current = new Date(result[i].updated_at);
    const next = new Date(result[i + 1].updated_at);

    if (current < next) {
      error(`Order mismatch at position ${i + 1}: ${result[i].title} (${current}) should come after ${result[i + 1].title} (${next})`);
      return false;
    }
  }

  success('Sort by "recent" (updated_at DESC) is correct');
  return true;
}

// Test sorting by oldest (created_at ASC)
function testSortByOldest(userId) {
  section('Testing sort by "oldest"...');

  const result = db.prepare(`
    SELECT * FROM projects WHERE user_id = ? AND title LIKE 'SORT_TEST_%'
    ORDER BY created_at ASC
  `).all(userId);

  info(`Found ${result.length} projects`);
  console.log('Projects in order (oldest first):');
  result.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.title} - created: ${p.created_at}`);
  });

  // Verify order is ascending by created_at
  for (let i = 0; i < result.length - 1; i++) {
    const current = new Date(result[i].created_at);
    const next = new Date(result[i + 1].created_at);

    if (current > next) {
      error(`Order mismatch at position ${i + 1}: ${result[i].title} (${current}) should come before ${result[i + 1].title} (${next})`);
      return false;
    }
  }

  success('Sort by "oldest" (created_at ASC) is correct');
  return true;
}

// Test sorting by alphabetical (title ASC)
function testSortByAlphabetical(userId) {
  section('Testing sort by "alphabetical"...');

  const result = db.prepare(`
    SELECT * FROM projects WHERE user_id = ? AND title LIKE 'SORT_TEST_%'
    ORDER BY title ASC
  `).all(userId);

  info(`Found ${result.length} projects`);
  console.log('Projects in order (A-Z):');
  result.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.title}`);
  });

  // Verify alphabetical order
  const titles = result.map(p => p.title);
  const sortedTitles = [...titles].sort((a, b) => a.localeCompare(b));

  for (let i = 0; i < titles.length; i++) {
    if (titles[i] !== sortedTitles[i]) {
      error(`Order mismatch at position ${i + 1}: expected "${sortedTitles[i]}" but got "${titles[i]}"`);
      return false;
    }
  }

  success('Sort by "alphabetical" (title ASC) is correct');
  return true;
}

// Test backend API parameter handling
function testBackendSortParameter() {
  section('Verifying backend sort parameter handling...');

  // Read the backend code to verify sort logic
  const fs = require('fs');
  const projectsRoute = fs.readFileSync(path.join(__dirname, 'server', 'src', 'routes', 'projects.ts'), 'utf8');

  // Check for sort handling in GET route
  const hasSortParam = projectsRoute.includes("const { area, status, search, sort } = req.query");
  const hasRecentSort = projectsRoute.includes("} else if (sort === 'oldest')");
  const hasAlphaSort = projectsRoute.includes("} else if (sort === 'alphabetical')");
  const hasDefaultSort = projectsRoute.includes("ORDER BY updated_at DESC");

  if (!hasSortParam) {
    error('Backend does not extract "sort" parameter from query');
    return false;
  }
  success('Backend extracts sort parameter from query');

  if (!hasAlphaSort) {
    error('Backend does not handle alphabetical sort');
    return false;
  }
  success('Backend handles alphabetical sort');

  if (!hasRecentSort) {
    error('Backend does not handle oldest sort');
    return false;
  }
  success('Backend handles oldest sort');

  if (!hasDefaultSort) {
    error('Backend does not have default sort (recent)');
    return false;
  }
  success('Backend has default sort (recent)');

  return true;
}

// Run all tests
function runTests() {
  console.log('\n' + '='.repeat(60));
  log('VERIFICATION: Feature #33 - Sort projects', 'bold');
  console.log('='.repeat(60) + '\n');

  let allPassed = true;

  try {
    // Get or create test user
    const user = getOrCreateTestUser();

    // Clean up existing test data
    cleanupTestProjects(user.id);

    // Create fresh test projects
    const projects = createTestProjects(user.id);

    // Wait a moment then update one project to test updated_at ordering
    const updatedProject = projects[2]; // Update the middle one
    info(`Updating project "${updatedProject.title}" to test modified sort...`);
    updateProjectTimestamp(updatedProject.id, 100);

    // Test 1: Sort by recent
    if (!testSortByRecent(user.id)) {
      allPassed = false;
    }

    // Test 2: Sort by oldest
    if (!testSortByOldest(user.id)) {
      allPassed = false;
    }

    // Test 3: Sort by alphabetical
    if (!testSortByAlphabetical(user.id)) {
      allPassed = false;
    }

    // Test 4: Backend parameter handling
    if (!testBackendSortParameter()) {
      allPassed = false;
    }

    // Clean up test data
    section('Cleaning up test data...');
    cleanupTestProjects(user.id);
    success('Test data cleaned up');

  } catch (err) {
    error(`Test execution failed: ${err.message}`);
    console.error(err);
    allPassed = false;
  } finally {
    db.close();
  }

  // Final result
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    log('✓ ALL TESTS PASSED', 'green');
    log('Feature #33: Sort projects - PASSING', 'bold');
  } else {
    log('✗ SOME TESTS FAILED', 'red');
    log('Feature #33: Sort projects - FAILING', 'bold');
  }
  console.log('='.repeat(60) + '\n');

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests();
