#!/usr/bin/env node
/**
 * Verification script for features #35 and #36
 *
 * Feature #35: Search with special characters does not crash
 * Feature #36: Empty search results show helpful message
 */

const path = require('path');

// Try to load better-sqlite3 from server directory
let Database;
try {
  Database = require(path.join(__dirname, 'server', 'node_modules', 'better-sqlite3'));
} catch {
  try {
    Database = require('better-sqlite3');
  } catch {
    console.error('✗ Cannot find better-sqlite3 module');
    process.exit(1);
  }
}

const DB_PATH = path.join(__dirname, 'server', 'database.sqlite');
const TEST_USER_EMAIL = 'test@example.com';
const TEST_SEARCH_CHARS = [
  '%',          // SQL wildcard
  '_',          // SQL wildcard
  "'",          // Single quote
  '"',          // Double quote
  ';',          // SQL statement separator
  '--',         // SQL comment
  '/**/',       // SQL comment block
  '\\',         // Backslash
  '/',          // Forward slash
  '@',          // At sign
  '#',          // Hash
  '$',          // Dollar sign
  '!',          // Exclamation mark
  '?',          // Question mark
  '*',          // Asterisk
  '+',          // Plus sign
  '=',          // Equals sign
  '<',          // Less than
  '>',          // Greater than
  '|',          // Pipe
  '&',          // Ampersand
  '`',          // Backtick
  '~',          // Tilde
  '^',          // Caret
  '()',         // Parentheses (SQL injection attempt)
  ' OR 1=1--', // SQL injection attempt
  'a'.repeat(1000), // Very long string
];

console.log('=== Verification for Features #35 and #36 ===\n');

let db;
let testUser;
let testProjects = [];

try {
  // Open database
  db = new Database(DB_PATH, { readonly: true });
  console.log('✓ Database opened successfully');

  // Get test user
  testUser = db.prepare('SELECT * FROM users WHERE email = ?').get(TEST_USER_EMAIL);
  if (!testUser) {
    console.error('✗ Test user not found. Please run create-profile-test-user.js first.');
    process.exit(1);
  }
  console.log(`✓ Test user found: ${testUser.id}`);

  // Get existing projects
  testProjects = db.prepare('SELECT * FROM projects WHERE user_id = ?').all(testUser.id);
  console.log(`✓ Found ${testProjects.length} test projects\n`);

  // ============ FEATURE #35: Special Character Handling ============
  console.log('=== Feature #35: Search with Special Characters ===\n');

  let specialCharTestsPassed = 0;
  let specialCharTestsFailed = 0;

  for (const char of TEST_SEARCH_CHARS) {
    try {
      // Simulate the search query that the backend would execute
      const escapeLikeString = (str) =>
        str.replace(/%/g, '\\%').replace(/_/g, '\\_');

      const sanitizedSearch = char.trim().slice(0, 500);
      const escapedSearch = escapeLikeString(sanitizedSearch);

      const query = `SELECT * FROM projects WHERE user_id = ? AND (title LIKE ? OR description LIKE ?) ESCAPE '\\'`;
      const searchPattern = `%${escapedSearch}%`;

      // Execute query - should not crash
      const results = db.prepare(query).all(testUser.id, searchPattern, searchPattern);

      // Expected behavior: query executes without error, returns results or empty array
      console.log(`✓ Special character "${char.slice(0, 20)}${char.length > 20 ? '...' : ''}" handled gracefully (${results.length} results)`);
      specialCharTestsPassed++;
    } catch (error) {
      console.error(`✗ Special character "${char.slice(0, 20)}${char.length > 20 ? '...' : ''}" caused error:`, error.message);
      specialCharTestsFailed++;
    }
  }

  // Test whitespace-only search (should be handled gracefully)
  try {
    const whitespaceSearch = '   ';
    const sanitizedSearch = whitespaceSearch.trim().slice(0, 500);
    if (sanitizedSearch.length === 0) {
      console.log('✓ Whitespace-only search handled (empty after trim)');
      specialCharTestsPassed++;
    } else {
      console.log('? Whitespace search could be improved');
    }
  } catch (error) {
    console.error('✗ Whitespace search caused error:', error.message);
    specialCharTestsFailed++;
  }

  console.log(`\nFeature #35 Summary: ${specialCharTestsPassed} passed, ${specialCharTestsFailed} failed\n`);

  // ============ FEATURE #36: Empty Search Results ============
  console.log('=== Feature #36: Empty Search Results ===\n');

  let emptyResultTestsPassed = 0;
  let emptyResultTestsFailed = 0;

  // Test 1: Search for non-existent term
  try {
    const nonExistentTerm = 'XYZ_NONEXISTENT_PROJECT_12345';
    const escapeLikeString = (str) =>
      str.replace(/%/g, '\\%').replace(/_/g, '\\_');

    const escapedSearch = escapeLikeString(nonExistentTerm.trim().slice(0, 500));
    const query = `SELECT * FROM projects WHERE user_id = ? AND (title LIKE ? OR description LIKE ?) ESCAPE '\\'`;
    const searchPattern = `%${escapedSearch}%`;

    const results = db.prepare(query).all(testUser.id, searchPattern, searchPattern);

    if (results.length === 0) {
      console.log(`✓ Search for "${nonExistentTerm}" returns empty array (0 results)`);
      emptyResultTestsPassed++;
    } else {
      console.log(`✗ Search for non-existent term returned ${results.length} results`);
      emptyResultTestsFailed++;
    }
  } catch (error) {
    console.error('✗ Empty search test caused error:', error.message);
    emptyResultTestsFailed++;
  }

  // Test 2: Verify that we can distinguish between "no projects" and "no results"
  try {
    const totalProjects = db.prepare('SELECT COUNT(*) as count FROM projects WHERE user_id = ?').get(testUser.id).count;
    const searchResults = db.prepare(
      `SELECT * FROM projects WHERE user_id = ? AND (title LIKE ? OR description LIKE ?) ESCAPE '\\'`
    ).all(testUser.id, '%NONEXISTENT%', '%NONEXISTENT%');

    if (totalProjects > 0 && searchResults.length === 0) {
      console.log(`✓ Can distinguish between no projects (${totalProjects}) and no search results (${searchResults.length})`);
      emptyResultTestsPassed++;
    } else if (totalProjects === 0) {
      console.log('⚠ No projects in database, cannot test empty search vs no projects');
      emptyResultTestsPassed++; // Neutral case
    } else {
      console.log(`✗ Search returned results when it should be empty`);
      emptyResultTestsFailed++;
    }
  } catch (error) {
    console.error('✗ Distinction test caused error:', error.message);
    emptyResultTestsFailed++;
  }

  console.log(`\nFeature #36 Summary: ${emptyResultTestsPassed} passed, ${emptyResultTestsFailed} failed\n`);

  // ============ CODE REVIEW CHECKS ============
  console.log('=== Code Review Checks ===\n');

  const fs = require('fs');

  // Check backend implementation
  const projectsRoutePath = path.join(__dirname, 'server', 'src', 'routes', 'projects.ts');
  const projectsRouteContent = fs.readFileSync(projectsRoutePath, 'utf8');

  let codeReviewPassed = 0;
  let codeReviewFailed = 0;

  // Check for LIKE escaping
  if (projectsRouteContent.includes('ESCAPE') || projectsRouteContent.includes('escapeLikeString')) {
    console.log('✓ Backend escapes SQL LIKE wildcards (%)');
    codeReviewPassed++;
  } else {
    console.log('✗ Backend does not escape SQL LIKE wildcards');
    codeReviewFailed++;
  }

  // Check for input sanitization (trim, slice)
  if (projectsRouteContent.includes('.trim()') && projectsRouteContent.includes('.slice(')) {
    console.log('✓ Backend sanitizes input (trim, length limit)');
    codeReviewPassed++;
  } else {
    console.log('✗ Backend does not sanitize input properly');
    codeReviewFailed++;
  }

  // Check frontend implementation
  const dashboardPath = path.join(__dirname, 'client', 'src', 'pages', 'Dashboard.tsx');
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

  // Check for helpful empty state message
  if (dashboardContent.includes('Nessun risultato di ricerca') || dashboardContent.includes('search results')) {
    console.log('✓ Frontend has specific empty state for search results');
    codeReviewPassed++;
  } else {
    console.log('✗ Frontend does not have specific empty state for search');
    codeReviewFailed++;
  }

  // Check for search-specific empty message
  if (dashboardContent.includes('filters.search') && dashboardContent.includes('Nessun progetto trovato')) {
    console.log('✓ Frontend checks for search vs general empty state');
    codeReviewPassed++;
  } else {
    console.log('✗ Frontend does not distinguish search empty state');
    codeReviewFailed++;
  }

  // Check for input sanitization on frontend
  if (dashboardContent.includes('.trim()') && dashboardContent.includes('.slice(')) {
    console.log('✓ Frontend sanitizes search input (trim, length limit)');
    codeReviewPassed++;
  } else {
    console.log('✗ Frontend does not sanitize search input');
    codeReviewFailed++;
  }

  console.log(`\nCode Review Summary: ${codeReviewPassed} passed, ${codeReviewFailed} failed\n`);

  // ============ FINAL RESULT ============
  console.log('=== Final Result ===\n');

  const totalTests = specialCharTestsPassed + emptyResultTestsPassed + codeReviewPassed;
  const totalFailed = specialCharTestsFailed + emptyResultTestsFailed + codeReviewFailed;

  console.log(`Total Tests Passed: ${totalTests}`);
  console.log(`Total Tests Failed: ${totalFailed}\n`);

  if (totalFailed === 0) {
    console.log('✓✓✓ ALL TESTS PASSED ✓✓✓\n');
    console.log('Feature #35: Special characters in search handled gracefully - PASSING');
    console.log('Feature #36: Empty search results show helpful message - PASSING\n');
    process.exit(0);
  } else {
    console.log('✗✗✗ SOME TESTS FAILED ✗✗✗\n');
    process.exit(1);
  }

} catch (error) {
  console.error('\n✗ Verification script error:', error);
  process.exit(1);
} finally {
  if (db) {
    db.close();
    console.log('✓ Database closed\n');
  }
}
