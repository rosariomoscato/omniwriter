#!/usr/bin/env node
// Feature 4: No Mock Data Patterns in Codebase
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== Feature 4: No Mock Data Patterns ===\n');

const projectDir = '/Users/rosario/CODICE/omniwriter';
const results = [];

// Patterns to search for
const patterns = [
  { name: 'globalThis', pattern: 'globalThis', description: 'globalThis pattern (indicates mock storage)' },
  { name: 'devStore', pattern: 'devStore', description: 'devStore pattern (indicates dev-only storage)' },
  { name: 'mockDb', pattern: 'mockDb', description: 'mockDb pattern' },
  { name: 'mockData', pattern: 'mockData', description: 'mockData pattern' },
  { name: 'testData', pattern: 'testData', description: 'testData pattern' },
  { name: 'fakeData', pattern: 'fakeData', description: 'fakeData pattern' },
  { name: 'sampleData', pattern: 'sampleData', description: 'sampleData pattern' },
  { name: 'dummyData', pattern: 'dummyData', description: 'dummyData pattern' },
  { name: 'TODO real', pattern: 'TODO.*real.*(database|API|backend)', description: 'TODO comments for real implementation' },
  { name: 'STUB', pattern: '\\bSTUB\\b', description: 'STUB comments' },
  { name: 'MOCK', pattern: '\\bMOCK\\b', description: 'MOCK comments' }
];

function grepPattern(pattern, excludeTests = false) {
  try {
    const excludeDirs = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.playwright-mcp',
      'verify-*.js',
      'test-*.js',
      '*.log'
    ].map(d => `--exclude-dir=${d}`).join(' ');

    const cmd = `grep -r -n -i "${pattern}" ${projectDir} ${excludeDirs} 2>/dev/null || true`;
    const output = execSync(cmd, { encoding: 'utf-8' });

    if (output.trim()) {
      return output.trim().split('\n');
    }
    return [];
  } catch (e) {
    return [];
  }
}

console.log('Checking for prohibited patterns...\n');

let hasIssues = false;

patterns.forEach(({ name, pattern, description }) => {
  console.log(`Checking: ${description}...`);
  const matches = grepPattern(pattern);

  if (matches.length > 0) {
    console.log(`  ⚠️  Found ${matches.length} matches:`);
    matches.slice(0, 5).forEach(m => console.log(`    - ${m}`));
    if (matches.length > 5) {
      console.log(`    ... and ${matches.length - 5} more`);
    }
    hasIssues = true;
  } else {
    console.log(`  ✓ No matches found`);
  }
  console.log();
});

// Check package.json for mock libraries
console.log('Checking package.json for mock libraries...');
const serverPackageJson = path.join(projectDir, 'server', 'package.json');
const clientPackageJson = path.join(projectDir, 'client', 'package.json');

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
      console.log(`  ⚠️  ${dir}/package.json has mock libraries: ${mockLibs.join(', ')}`);
      hasIssues = true;
    } else {
      console.log(`  ✓ ${dir}/package.json: no mock libraries`);
    }
  }
});

console.log();

if (hasIssues) {
  console.log('❌ Feature 4: FAILED - Found prohibited mock patterns');
  process.exit(1);
} else {
  console.log('✅ Feature 4: PASSED - No mock data patterns found');
  process.exit(0);
}
