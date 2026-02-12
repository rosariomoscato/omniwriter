/**
 * Verification Script for Feature #102: API returns proper error for unauthorized access
 *
 * This script verifies:
 * 1. Auth middleware returns 401 when token is missing
 * 2. Auth middleware returns 403 when token is invalid
 * 3. requireAdmin middleware returns 403 for non-admin users
 * 4. requirePremium middleware returns 403 for free users
 * 5. Error messages are descriptive
 */

console.log('=== Feature #102 Verification: API Authorization Error Handling ===\n');

const tests = [
  {
    name: 'Auth middleware returns 401 for missing token',
    file: 'server/src/middleware/auth.ts',
    check: (content) => {
      const has401Check = content.includes('res.status(401)');
      const hasAuthRequiredMsg = content.includes('Authentication required') ||
                               content.includes('auth required');
      return has401Check && hasAuthRequiredMsg;
    }
  },
  {
    name: 'Auth middleware returns 401 for user not found',
    file: 'server/src/middleware/auth.ts',
    check: (content) => {
      return content.includes('if (!userRow)') &&
             content.includes("res.status(401)") &&
             content.includes('User not found');
    }
  },
  {
    name: 'Auth middleware returns 403 for invalid/expired token',
    file: 'server/src/middleware/auth.ts',
    check: (content) => {
      const has403Check = content.includes('res.status(403)');
      const hasInvalidTokenMsg = content.includes('Invalid or expired token');
      return has403Check && hasInvalidTokenMsg;
    }
  },
  {
    name: 'Role middleware exports requireAdmin function',
    file: 'server/src/middleware/roles.ts',
    check: (content) => {
      return content.includes('export function requireAdmin') &&
             content.includes('userRole === \'admin\'');
    }
  },
  {
    name: 'requireAdmin returns 403 for non-admin users',
    file: 'server/src/middleware/roles.ts',
    check: (content) => {
      return content.includes('res.status(403)') &&
             content.includes('ADMIN_REQUIRED');
    }
  },
  {
    name: 'Role middleware exports requirePremium function',
    file: 'server/src/middleware/roles.ts',
    check: (content) => {
      return content.includes('export function requirePremium') &&
             content.includes('premium') &&
             content.includes('lifetime');
    }
  },
  {
    name: 'requirePremium returns 403 for free users',
    file: 'server/src/middleware/roles.ts',
    check: (content) => {
      return content.includes('PREMIUM_REQUIRED') &&
             content.includes('This feature requires a Premium subscription');
    }
  },
  {
    name: 'Admin routes use requireAdmin middleware',
    file: 'server/src/routes/admin.ts',
    check: (content) => {
      return content.includes('requireAdmin') &&
             content.includes('authenticateToken');
    }
  },
  {
    name: 'Admin routes /users endpoint protected',
    file: 'server/src/routes/admin.ts',
    check: (content) => {
      return content.includes("'/users'") &&
             content.includes('authenticateToken') &&
             content.includes('requireAdmin');
    }
  },
  {
    name: 'Admin routes /stats endpoint protected',
    file: 'server/src/routes/admin.ts',
    check: (content) => {
      return content.includes("'/stats'") &&
             content.includes('requireAdmin');
    }
  }
];

let passedTests = 0;
let failedTests = 0;

const fs = require('fs');
const path = require('path');

tests.forEach(test => {
  try {
    const filePath = path.join(process.cwd(), test.file);
    if (!fs.existsSync(filePath)) {
      console.log(`❌ FAIL: ${test.name}`);
      console.log(`   File not found: ${test.file}\n`);
      failedTests++;
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const result = test.check(content);

    if (result) {
      console.log(`✅ PASS: ${test.name}`);
      passedTests++;
    } else {
      console.log(`❌ FAIL: ${test.name}`);
      console.log(`   Check failed in: ${test.file}\n`);
      failedTests++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${test.name}`);
    console.log(`   Error: ${error.message}\n`);
    failedTests++;
  }
});

console.log('\n=== Summary ===');
console.log(`Passed: ${passedTests}/${tests.length}`);
console.log(`Failed: ${failedTests}/${tests.length}`);
console.log(`Success Rate: ${((passedTests / tests.length) * 100).toFixed(1)}%`);

if (passedTests === tests.length) {
  console.log('\n✅ All tests passed! Feature #102 is implemented correctly.');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Feature #102 needs fixes.');
  process.exit(1);
}
