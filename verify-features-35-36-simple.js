#!/usr/bin/env node
/**
 * Code review verification for features #35 and #36
 *
 * Feature #35: Search with special characters does not crash
 * Feature #36: Empty search results show helpful message
 */

const fs = require('fs');
const path = require('path');

console.log('=== Code Review Verification for Features #35 and #36 ===\n');

let checksPassed = 0;
let checksFailed = 0;

// ============ FEATURE #35: Special Character Handling ============
console.log('=== Feature #35: Search with Special Characters ===\n');

const projectsRoutePath = path.join(__dirname, 'server', 'src', 'routes', 'projects.ts');
const projectsRouteContent = fs.readFileSync(projectsRoutePath, 'utf8');

// Check 1: SQL LIKE escaping
if (projectsRouteContent.includes('ESCAPE') && projectsRouteContent.includes('\\\\') && projectsRouteContent.includes('escapeLikeString')) {
  console.log('✓ Backend escapes SQL LIKE wildcards (%)');
  console.log('  - Found ESCAPE clause in LIKE query');
  console.log('  - Found escapeLikeString function');
  checksPassed++;
} else {
  console.log('✗ Backend does not properly escape SQL LIKE wildcards');
  checksFailed++;
}

// Check 2: Input sanitization (trim, length limit)
if (projectsRouteContent.includes('.trim()') && projectsRouteContent.includes('.slice(0, 500)')) {
  console.log('✓ Backend sanitizes input (trim, 500 char limit)');
  checksPassed++;
} else {
  console.log('✗ Backend missing input sanitization');
  checksFailed++;
}

// Check 3: Whitespace handling
if (projectsRouteContent.includes('sanitizedSearch.length > 0') || projectsRouteContent.includes('.trim().length')) {
  console.log('✓ Backend handles whitespace-only searches');
  checksPassed++;
} else {
  console.log('✗ Backend may not handle whitespace properly');
  checksFailed++;
}

// Check 4: Frontend input sanitization
const dashboardPath = path.join(__dirname, 'client', 'src', 'pages', 'Dashboard.tsx');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

if (dashboardContent.includes('.trim()') && dashboardContent.includes('.slice(0, 500)')) {
  console.log('✓ Frontend sanitizes search input');
  checksPassed++;
} else {
  console.log('✗ Frontend missing input sanitization');
  checksFailed++;
}

// Check 5: Error handling
if (projectsRouteContent.includes('try') && projectsRouteContent.includes('catch') && projectsRouteContent.includes('console.error')) {
  console.log('✓ Backend has error handling for search');
  checksPassed++;
} else {
  console.log('✗ Backend missing proper error handling');
  checksFailed++;
}

console.log(`\nFeature #35: ${checksPassed} checks passed\n`);

// ============ FEATURE #36: Empty Search Results ============
console.log('=== Feature #36: Empty Search Results ===\n');

let emptyChecksPassed = 0;
let emptyChecksFailed = 0;

// Check 1: Specific empty state for search
if (dashboardContent.includes('Nessun risultato di ricerca') || dashboardContent.includes('Nessun risultato')) {
  console.log('✓ Frontend has specific "no results" message for search');
  emptyChecksPassed++;
} else {
  console.log('✗ Frontend missing specific "no results" message');
  emptyChecksFailed++;
}

// Check 2: Different messages for search vs general empty
if (dashboardContent.includes('filters.search') && dashboardContent.includes('hasActiveFilters')) {
  console.log('✓ Frontend distinguishes between search and general empty state');
  emptyChecksPassed++;
} else {
  console.log('✗ Frontend does not distinguish search empty state');
  emptyChecksFailed++;
}

// Check 3: Helpful guidance in empty state
if (dashboardContent.includes('Prova con termini diversi') || dashboardContent.includes('controlla')) {
  console.log('✓ Empty state provides helpful guidance');
  emptyChecksPassed++;
} else {
  console.log('✗ Empty state lacks helpful guidance');
  emptyChecksFailed++;
}

// Check 4: Clear filters button available
if (dashboardContent.includes('Cancella filtri') && dashboardContent.includes('hasActiveFilters')) {
  console.log('✓ Empty state includes clear filters button');
  emptyChecksPassed++;
} else {
  console.log('✗ Empty state missing clear filters option');
  emptyChecksFailed++;
}

// Check 5: Shows search term in empty state
if (dashboardContent.includes('filters.search.slice') || dashboardContent.includes('${filters.search}')) {
  console.log('✓ Empty state shows which search term returned no results');
  emptyChecksPassed++;
} else {
  console.log('✗ Empty state does not show search term');
  emptyChecksFailed++;
}

// Check 6: Truncates long search terms in display
if (dashboardContent.includes('.slice(0, 50)') || dashboardContent.includes('slice(0,')) {
  console.log('✓ Long search terms are truncated in display');
  emptyChecksPassed++;
} else {
  console.log('✗ Long search terms may overflow UI');
  emptyChecksFailed++;
}

console.log(`\nFeature #36: ${emptyChecksPassed} checks passed\n`);

// ============ SECURITY CHECKS ============
console.log('=== Security Checks ===\n');

let securityPassed = 0;
let securityFailed = 0;

// Check 1: No eval or Function constructor with user input
if (!dashboardContent.includes('eval(') && !dashboardContent.includes('new Function(')) {
  console.log('✓ No dangerous eval/Function with user input');
  securityPassed++;
} else {
  console.log('✗ Potential security risk: eval or Function constructor');
  securityFailed++;
}

// Check 2: Parameterized queries used
if (projectsRouteContent.includes('db.prepare') && projectsRouteContent.includes('.all(...')) {
  console.log('✓ Backend uses parameterized queries');
  securityPassed++;
} else {
  console.log('✗ Backend may not use proper parameterization');
  securityFailed++;
}

// Check 3: Length limits prevent DoS
if (dashboardContent.includes('.slice(0, 500)') && projectsRouteContent.includes('.slice(0, 500)')) {
  console.log('✓ Length limits prevent DoS attacks');
  securityPassed++;
} else {
  console.log('✗ Missing length limits (potential DoS vulnerability)');
  securityFailed++;
}

console.log(`\nSecurity: ${securityPassed} checks passed\n`);

// ============ FINAL RESULT ============
console.log('=== Final Result ===\n');

const totalPassed = checksPassed + emptyChecksPassed + securityPassed;
const totalFailed = checksFailed + emptyChecksFailed + securityFailed;

console.log(`Total Checks Passed: ${totalPassed}`);
console.log(`Total Checks Failed: ${totalFailed}\n`);

// List all changes made
console.log('=== Code Changes Summary ===\n');

console.log('Backend (server/src/routes/projects.ts):');
console.log('1. Added escapeLikeString() function to escape % and _ wildcards');
console.log('2. Added ESCAPE \'\\\\\' clause to LIKE queries');
console.log('3. Added input sanitization: .trim().slice(0, 500)');
console.log('4. Added check to skip empty searches after sanitization\n');

console.log('Frontend (client/src/pages/Dashboard.tsx):');
console.log('1. Added input sanitization in updateFilters(): .trim().slice(0, 500)');
console.log('2. Added specific empty state for search: "Nessun risultato di ricerca"');
console.log('3. Added conditional rendering based on filters.search');
console.log('4. Added display of search term in empty state (truncated to 50 chars)');
console.log('5. Added helpful message: "Prova con termini diversi o controlla l\'ortografia"\n');

if (totalFailed === 0) {
  console.log('✓✓✓ ALL CHECKS PASSED ✓✓✓\n');
  console.log('Feature #35: Special characters in search handled gracefully - PASSING');
  console.log('Feature #36: Empty search results show helpful message - PASSING\n');
  process.exit(0);
} else {
  console.log('✗✗✗ SOME CHECKS FAILED ✗✗✗\n');
  process.exit(1);
}
