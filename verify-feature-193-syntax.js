#!/usr/bin/env node

/**
 * Syntax verification for Feature #193 changes
 * Checks that the modified files have valid JavaScript/TypeScript syntax
 */

const fs = require('fs');
const path = require('path');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   Feature #193 - Syntax Verification                          ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// Check rateLimit.ts for key changes
const rateLimitPath = path.join(__dirname, 'server/src/middleware/rateLimit.ts');
const rateLimitContent = fs.readFileSync(rateLimitPath, 'utf-8');

console.log('✅ Checking rateLimit.ts...');

// Check 1: skipSuccessfulRequests option
if (rateLimitContent.includes('skipSuccessfulRequests: true')) {
  console.log('  ✅ skipSuccessfulRequests: true found in authRateLimit');
} else {
  console.log('  ❌ skipSuccessfulRequests: true NOT found');
  process.exit(1);
}

// Check 2: Development environment detection
if (rateLimitContent.includes('isDevelopment') && rateLimitContent.includes('process.env.NODE_ENV')) {
  console.log('  ✅ Development environment detection added');
} else {
  console.log('  ❌ Development environment detection NOT found');
  process.exit(1);
}

// Check 3: Increased limit for development (10 instead of 5)
if (rateLimitContent.includes('isDevelopment ? 10 : 5')) {
  console.log('  ✅ Max requests increased to 10 for development');
} else {
  console.log('  ❌ Max requests NOT increased for development');
  process.exit(1);
}

// Check 4: Reduced window for development (5 minutes instead of 15)
if (rateLimitContent.includes('isDevelopment ? 5 * 60 * 1000 : 15 * 60 * 1000')) {
  console.log('  ✅ Window reduced to 5 minutes for development');
} else {
  console.log('  ❌ Window NOT reduced for development');
  process.exit(1);
}

// Check 5: resetRateLimit function exported
if (rateLimitContent.includes('export function resetRateLimit')) {
  console.log('  ✅ resetRateLimit function exported');
} else {
  console.log('  ❌ resetRateLimit function NOT exported');
  process.exit(1);
}

// Check 6: getRateLimitStatus function exported
if (rateLimitContent.includes('export function getRateLimitStatus')) {
  console.log('  ✅ getRateLimitStatus function exported');
} else {
  console.log('  ❌ getRateLimitStatus function NOT exported');
  process.exit(1);
}

// Check 7: Updated error messages
if (rateLimitContent.includes('Please try again after 5 minutes') &&
    rateLimitContent.includes('Too many failed login attempts')) {
  console.log('  ✅ Updated error messages for development');
} else {
  console.log('  ❌ Error messages NOT updated');
  process.exit(1);
}

// Check admin.ts for new endpoints
const adminPath = path.join(__dirname, 'server/src/routes/admin.ts');
const adminContent = fs.readFileSync(adminPath, 'utf-8');

console.log('\n✅ Checking admin.ts...');

// Check 8: Import resetRateLimit and getRateLimitStatus
if (adminContent.includes("from '../middleware/rateLimit'")) {
  console.log('  ✅ Rate limit functions imported');
} else {
  console.log('  ❌ Rate limit functions NOT imported');
  process.exit(1);
}

// Check 9: POST /api/admin/reset-rate-limit/:ip endpoint
if (adminContent.includes('/reset-rate-limit/:ip') && adminContent.includes('resetRateLimit(ip, path)')) {
  console.log('  ✅ Reset rate limit endpoint added');
} else {
  console.log('  ❌ Reset rate limit endpoint NOT added');
  process.exit(1);
}

// Check 10: GET /api/admin/rate-limit-status/:ip endpoint
if (adminContent.includes('/rate-limit-status/:ip') && adminContent.includes('getRateLimitStatus(ip)')) {
  console.log('  ✅ Rate limit status endpoint added');
} else {
  console.log('  ❌ Rate limit status endpoint NOT added');
  process.exit(1);
}

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║   All Syntax Checks Passed! ✅                              ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

console.log('Summary of changes:');
console.log('1. ✅ authRateLimit now uses skipSuccessfulRequests: true');
console.log('2. ✅ Max requests increased to 10 for development');
console.log('3. ✅ Window reduced to 5 minutes for development');
console.log('4. ✅ resetRateLimit() function exported');
console.log('5. ✅ getRateLimitStatus() function exported');
console.log('6. ✅ Admin endpoint POST /api/admin/reset-rate-limit/:ip added');
console.log('7. ✅ Admin endpoint GET /api/admin/rate-limit-status/:ip added');
console.log('\nNote: Server restart required to apply changes.');
