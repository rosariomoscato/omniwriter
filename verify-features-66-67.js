#!/usr/bin/env node

/**
 * Verification script for Features #66 and #67
 *
 * Feature #66: Full-screen writing mode
 * Feature #67: Word count and reading time display
 *
 * This script performs static analysis and code verification.
 */

const fs = require('fs');
const path = require('path');

const EDITOR_FILE = path.join(__dirname, 'client/src/pages/ChapterEditor.tsx');

console.log('='.repeat(60));
console.log('Verifying Features #66 and #67');
console.log('='.repeat(60));

// Read the ChapterEditor file
const content = fs.readFileSync(EDITOR_FILE, 'utf-8');

// Feature #66: Full-screen mode checks
console.log('\n📺 Feature #66: Full-screen writing mode');
console.log('-'.repeat(60));

const checks66 = [
  {
    name: 'Maximize icon imported',
    test: () => content.includes('Maximize'),
    expected: true
  },
  {
    name: 'Minimize icon imported',
    test: () => content.includes('Minimize'),
    expected: true
  },
  {
    name: 'isFullScreen state declared',
    test: () => content.includes('const [isFullScreen, setIsFullScreen] = useState(false)'),
    expected: true
  },
  {
    name: 'Full-screen toggle button present',
    test: () => content.includes('onClick={() => setIsFullScreen(!isFullScreen)}'),
    expected: true
  },
  {
    name: 'Fixed positioning when full-screen',
    test: () => content.includes('fixed inset-0 z-50'),
    expected: true
  },
  {
    name: 'Breadcrumbs hidden in full-screen',
    test: () => content.includes('{!isFullScreen && <Breadcrumbs />}'),
    expected: true
  },
  {
    name: 'Footer hidden in full-screen',
    test: () => content.includes('{!isFullScreen && (') && content.includes('Status:'),
    expected: true
  },
  {
    name: 'ESC key handler for exit',
    test: () => content.includes("e.key === 'Escape' && isFullScreen"),
    expected: true
  },
  {
    name: 'isFullScreen in useEffect deps',
    test: () => content.includes('[handleUndo, handleRedo, isFullScreen]'),
    expected: true
  }
];

let passed66 = 0;
let failed66 = 0;

checks66.forEach(check => {
  const result = check.test();
  const passed = result === check.expected;
  if (passed) {
    console.log(`  ✅ ${check.name}`);
    passed66++;
  } else {
    console.log(`  ❌ ${check.name}`);
    failed66++;
  }
});

console.log(`\nFeature #66: ${passed66}/${checks66.length} checks passed`);

// Feature #67: Word count and reading time checks
console.log('\n⏱️  Feature #67: Word count and reading time display');
console.log('-'.repeat(60));

const checks67 = [
  {
    name: 'readingTime state declared',
    test: () => content.includes('const [readingTime, setReadingTime] = useState(0)'),
    expected: true
  },
  {
    name: 'Reading time calculation (200 wpm)',
    test: () => content.includes('Math.ceil(words.length / 200)'),
    expected: true
  },
  {
    name: 'Reading time updates with content',
    test: () => {
      // Check if readingTime is in the same useEffect as wordCount
      const wordCountEffectMatch = content.match(/useEffect\(\(\) => \{[\s\S]*?setWordCount[\s\S]*?\}, \[content\]\);/);
      return wordCountEffectMatch && wordCountEffectMatch[0].includes('setReadingTime');
    },
    expected: true
  },
  {
    name: 'Word count displayed',
    test: () => content.includes('{wordCount} words'),
    expected: true
  },
  {
    name: 'Reading time displayed',
    test: () => content.includes('{readingTime} min read'),
    expected: true
  },
  {
    name: 'Reading time conditional display',
    test: () => content.includes('{wordCount > 0 && (') || content.match(/\{wordCount\s*>\s*0/),
    expected: true
  },
  {
    name: 'Both stats in header toolbar',
    test: () => {
      // Check if both are in the header actions div
      const headerSection = content.match(/<div className="flex items-center gap-2">([\s\S]*?)<\/div>/);
      return headerSection && headerSection[0].includes('wordCount') && headerSection[0].includes('readingTime');
    },
    expected: true
  }
];

let passed67 = 0;
let failed67 = 0;

checks67.forEach(check => {
  const result = check.test();
  const passed = result === check.expected;
  if (passed) {
    console.log(`  ✅ ${check.name}`);
    passed67++;
  } else {
    console.log(`  ❌ ${check.name}`);
    failed67++;
  }
});

console.log(`\nFeature #67: ${passed67}/${checks67.length} checks passed`);

// Mock data detection
console.log('\n🔍 Mock Data Detection');
console.log('-'.repeat(60));

const mockPatterns = [
  'globalThis',
  'devStore',
  'dev-store',
  'mockDb',
  'mockData',
  'fakeData',
  'sampleData',
  'dummyData'
];

let mockFound = false;
mockPatterns.forEach(pattern => {
  if (content.includes(pattern) && !content.includes(`// ${pattern}`)) {
    console.log(`  ⚠️  Found potential mock pattern: ${pattern}`);
    mockFound = true;
  }
});

if (!mockFound) {
  console.log('  ✅ No mock data patterns detected');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`Feature #66 (Full-screen): ${passed66}/${checks66.length} checks passed`);
console.log(`Feature #67 (Word count + Reading time): ${passed67}/${checks67.length} checks passed`);
console.log(`Total: ${passed66 + passed67}/${checks66.length + checks67.length} checks passed`);

if (failed66 === 0 && failed67 === 0 && !mockFound) {
  console.log('\n✅ All checks passed! Features are ready for manual testing.');
  process.exit(0);
} else {
  console.log('\n⚠️  Some checks failed. Please review the implementation.');
  process.exit(1);
}
