/**
 * Verification script for Performance Features #151 and #152
 *
 * Feature #151: Page load performance with many projects
 * - Dashboard loads quickly with 100+ projects
 * - Verify page loads within 3 seconds
 * - Verify no UI freeze
 *
 * Feature #152: Search response time acceptable
 * - With 100+ projects in DB
 * - Search returns results within 1 second
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath);

console.log('='.repeat(60));
console.log('Performance Features #151 & #152 Verification');
console.log('='.repeat(60));

// Check current project count
const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get();
console.log(`\n[Current State] Total projects in DB: ${projectCount.count}`);

// Check database schema for indexes
const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='projects'").all();
console.log(`\n[Database] Current indexes on projects table:`);
if (indexes.length === 0) {
  console.log('  ❌ No indexes found on projects table');
} else {
  indexes.forEach(idx => console.log(`  ✓ ${idx.name}`));
}

// Check for N+1 query pattern in code
const fs = require('fs');
const projectsRoutePath = path.join(__dirname, 'src', 'routes', 'projects.ts');
const projectsRouteCode = fs.readFileSync(projectsRoutePath, 'utf8');

console.log('\n[Code Analysis] Checking for performance optimizations:');

// Check for pagination
const hasPagination = projectsRouteCode.includes('LIMIT') && projectsRouteCode.includes('OFFSET');
console.log(`  ${hasPagination ? '✓' : '❌'} Pagination implemented`);

// Check for N+1 query problem
const hasNPlusOne = projectsRouteCode.includes('SELECT tag_name FROM project_tags WHERE project_id = ?');
console.log(`  ${hasNPlusOne ? '❌' : '✓'} N+1 query issue (tags fetched in loop)`);
if (hasNPlusOne) {
  console.log('    ⚠️  Fix: Use a single query with GROUP_CONCAT or JOIN');
}

// Check for prepared statements
const hasPreparedStatements = projectsRouteCode.includes('prepare(');
console.log(`  ${hasPreparedStatements ? '✓' : '❌'} Using prepared statements`);

// Check for indexes on commonly queried columns
const hasUserIdIndex = indexes.some(idx => idx.name.includes('user_id'));
const hasTitleIndex = indexes.some(idx => idx.name.includes('title'));
const hasUpdatedAtIndex = indexes.some(idx => idx.name.includes('updated_at'));

console.log(`  ${hasUserIdIndex ? '✓' : '❌'} Index on user_id (for filtering)`);
console.log(`  ${hasTitleIndex ? '✓' : '❌'} Index on title (for search)`);
console.log(`  ${hasUpdatedAtIndex ? '✓' : '❌'} Index on updated_at (for sorting)`);

// Recommendations
console.log('\n[Recommendations]');
if (!hasPagination) {
  console.log('  1. Implement pagination with LIMIT/OFFSET');
  console.log('     - Add ?page=1&limit=20 query params');
  console.log('     - Return total count for pagination UI');
}

if (hasNPlusOne) {
  console.log('  2. Fix N+1 query for tags:');
  console.log('     - Use GROUP_CONCAT to fetch tags in one query');
  console.log('     - Or use a LEFT JOIN with GROUP BY');
}

if (!hasTitleIndex || !hasUpdatedAtIndex) {
  console.log('  3. Add database indexes:');
  if (!hasUserIdIndex) console.log('     - CREATE INDEX idx_projects_user_id ON projects(user_id)');
  if (!hasTitleIndex) console.log('     - CREATE INDEX idx_projects_title ON projects(title)');
  if (!hasUpdatedAtIndex) console.log('     - CREATE INDEX idx_projects_updated_at ON projects(updated_at)');
}

// Performance test requirements
console.log('\n[Performance Requirements]');
console.log('  Feature #151:');
console.log('    - With 100+ projects, dashboard must load within 3 seconds');
console.log('    - No UI freeze during loading');
console.log('    - Pagination should show first 20-50 items quickly');
console.log('  Feature #152:');
console.log('    - With 100+ projects, search must return results within 1 second');
console.log('    - Search should use indexed columns');

// Create test data if needed
if (projectCount.count < 100) {
  console.log(`\n[Action] Need to create ${100 - projectCount.count} test projects for performance testing`);
  console.log('  Run: node create-test-projects.js');
}

db.close();
console.log('\n' + '='.repeat(60));
console.log('Analysis complete. Implement optimizations to pass features #151 & #152.');
console.log('='.repeat(60));
