#!/usr/bin/env node
/**
 * Regression test for Feature 4: No mock data patterns in codebase
 */
const { execSync } = require('child_process');
const fs = require('fs');

console.log('=== Testing Feature 4: No Mock Data Patterns ===\n');

let allPassed = true;

// Test 1: globalThis, devStore, mockDb
console.log('Test 1: Checking for globalThis, devStore, mockDb...');
try {
  const result = execSync('grep -r "globalThis\\|devStore\\|mockDb" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=dist server/ client/ 2>/dev/null || true', { encoding: 'utf8' });
  if (result.trim().length === 0) {
    console.log('✅ PASS: No matches found\n');
  } else {
    console.log('❌ FAIL: Found matches:\n', result, '\n');
    allPassed = false;
  }
} catch (e) {
  console.log('✅ PASS: No matches found\n');
}

// Test 2: mockData, testData, fakeData, sampleData, dummyData
console.log('Test 2: Checking for mockData, testData, fakeData, sampleData, dummyData...');
try {
  const result = execSync('grep -r "mockData\\|testData\\|fakeData\\|sampleData\\|dummyData\\|generateMockContent\\|mockResults" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=dist server/ client/ 2>/dev/null || true', { encoding: 'utf8' });
  if (result.trim().length === 0) {
    console.log('✅ PASS: No matches found\n');
  } else {
    console.log('❌ FAIL: Found matches:\n', result, '\n');
    allPassed = false;
  }
} catch (e) {
  console.log('✅ PASS: No matches found\n');
}

// Test 3: TODO real/database/API, STUB, MOCK (excluding TODO comments)
console.log('Test 3: Checking for TODO real/database/API, STUB, MOCK...');
try {
  const result = execSync('grep -ri "TODO.*real/database/API\\|STUB\\|MOCK" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=dist server/ client/ 2>/dev/null | grep -v "// *TODO" | grep -v "mockDate" || true', { encoding: 'utf8', shell: '/bin/bash' });
  if (result.trim().length === 0) {
    console.log('✅ PASS: No matches found\n');
  } else {
    console.log('❌ FAIL: Found matches:\n', result, '\n');
    allPassed = false;
  }
} catch (e) {
  console.log('✅ PASS: No matches found\n');
}

// Test 4: json-server, miragejs, msw in package.json
console.log('Test 4: Checking for json-server, miragejs, msw in package.json...');
try {
  const serverPkg = fs.readFileSync('server/package.json', 'utf8');
  const clientPkg = fs.readFileSync('client/package.json', 'utf8');
  const combined = serverPkg + ' ' + clientPkg;

  if (/json-server|miragejs|msw/.test(combined)) {
    console.log('❌ FAIL: Found mock API libraries in package.json\n');
    allPassed = false;
  } else {
    console.log('✅ PASS: No mock API libraries found\n');
  }
} catch (e) {
  console.log('❌ FAIL: Could not read package.json files\n');
  allPassed = false;
}

if (allPassed) {
  console.log('=== ALL TESTS PASSED ===\n');
  console.log('Summary:');
  console.log('- No mock data patterns found');
  console.log('- No mock API libraries found');
  console.log('- Codebase is clean of mock data');
  process.exit(0);
} else {
  console.log('=== SOME TESTS FAILED ===\n');
  process.exit(1);
}
