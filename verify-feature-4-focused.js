#!/usr/bin/env node
// Feature 4: No Mock Data Patterns in PRODUCTION CODE
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== Feature 4: No Mock Data Patterns in Production Code ===\n');

const projectDir = '/Users/rosario/CODICE/omniwriter';
const serverSrc = path.join(projectDir, 'server', 'src');
const clientSrc = path.join(projectDir, 'client', 'src');

// Check if source directories exist
if (!fs.existsSync(serverSrc)) {
  console.log('⚠️  server/src not found - skipping server checks');
} else {
  console.log('✓ server/src exists');
}
if (!fs.existsSync(clientSrc)) {
  console.log('⚠️  client/src not found - skipping client checks');
} else {
  console.log('✓ client/src exists');
}
console.log();

const results = [];
let hasIssues = false;

// Only search in production source code
const searchDirs = [];
if (fs.existsSync(serverSrc)) searchDirs.push(serverSrc);
if (fs.existsSync(clientSrc)) searchDirs.push(clientSrc);

if (searchDirs.length === 0) {
  console.log('❌ No source directories found');
  process.exit(1);
}

function grepInSources(pattern) {
  try {
    const dirs = searchDirs.join(' ');
    const cmd = `grep -r -n -i "${pattern}" ${dirs} 2>/dev/null || true`;
    const output = execSync(cmd, { encoding: 'utf-8' });
    return output.trim() ? output.trim().split('\n') : [];
  } catch (e) {
    return [];
  }
}

console.log('Checking production source code for prohibited patterns...\n');

// Critical patterns that indicate mock data
const patterns = [
  { name: 'globalThis', pattern: 'globalThis' },
  { name: 'devStore', pattern: 'devStore|dev-store|DevStore' },
  { name: 'mockDb', pattern: 'mockDb|mock-db|mock_db' },
  { name: 'mockData', pattern: 'mockData|mock-data' },
  { name: 'fakeData', pattern: 'fakeData|fake-data' },
  { name: 'sampleData', pattern: 'sampleData' },
  { name: 'dummyData', pattern: 'dummyData' },
  { name: 'testData', pattern: 'testData' },
  { name: 'isDevelopment', pattern: 'isDevelopment|isDev.*\\?.*:' },
  { name: 'TODO real', pattern: 'TODO.*real.*(database|API|backend)' },
  { name: 'STUB', pattern: '\\bSTUB\\b' },
  { name: 'MOCK', pattern: '\\bMOCK\\b' }
];

patterns.forEach(({ name, pattern }) => {
  console.log(`Checking: ${name}...`);
  const matches = grepInSources(pattern);

  if (matches.length > 0) {
    console.log(`  ❌ Found ${matches.length} matches in PRODUCTION CODE:`);
    matches.forEach(m => console.log(`    ${m}`));
    hasIssues = true;
  } else {
    console.log(`  ✓ No matches in production code`);
  }
});

// Check package.json for mock libraries
console.log('\nChecking package.json for mock libraries...');
['server', 'client'].forEach(dir => {
  const pkgPath = path.join(projectDir, dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    const mockLibs = Object.keys(allDeps).filter(dep =>
      dep.includes('json-server') ||
      dep.includes('miragejs') ||
      dep.includes('msw')
    );

    if (mockLibs.length > 0) {
      console.log(`  ❌ ${dir}/package.json has mock libraries: ${mockLibs.join(', ')}`);
      hasIssues = true;
    } else {
      console.log(`  ✓ ${dir}/package.json: no mock libraries`);
    }
  }
});

console.log();

if (hasIssues) {
  console.log('❌ Feature 4: FAILED - Found prohibited mock patterns in production code');
  process.exit(1);
} else {
  console.log('✅ Feature 4: PASSED - No mock data patterns in production code');
  process.exit(0);
}
