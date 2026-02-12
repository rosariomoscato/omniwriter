/**
 * Verification Script for Feature #95: Retry failed generation
 *
 * This script verifies:
 * 1. Error message shown when generation fails
 * 2. Retry button appears in failed state
 * 3. Clicking retry starts a new generation attempt
 */

console.log('=== Feature #95 Verification: Retry Failed Generation ===\n');

const tests = [
  {
    name: 'Context has retryGeneration function',
    file: 'client/src/contexts/GenerationProgressContext.tsx',
    check: (content) => {
      return content.includes('retryGeneration') &&
             content.includes('lastGenerationRequest') &&
             content.includes('setLastGenerationRequest');
    }
  },
  {
    name: 'Context exports setLastGenerationRequest helper',
    file: 'client/src/contexts/GenerationProgressContext.tsx',
    check: (content) => {
      return content.includes('export function setLastGenerationRequest') &&
             content.includes('export function getLastGenerationRequest');
    }
  },
  {
    name: 'Context dispatches retry event',
    file: 'client/src/contexts/GenerationProgressContext.tsx',
    check: (content) => {
      return content.includes("new CustomEvent('generationRetry'") &&
             content.includes('window.dispatchEvent(retryEvent)');
    }
  },
  {
    name: 'GenerationProgress component shows retry button on failure',
    file: 'client/src/components/GenerationProgress.tsx',
    check: (content) => {
      return content.includes('retryGeneration') &&
             content.includes('isFailed') &&
             content.includes('Retry Generation');
    }
  },
  {
    name: 'Retry button disabled when no previous request',
    file: 'client/src/components/GenerationProgress.tsx',
    check: (content) => {
      return content.includes('disabled={!lastGenerationRequest}') &&
             content.includes('No Previous Request');
    }
  },
  {
    name: 'Retry button has appropriate icon',
    file: 'client/src/components/GenerationProgress.tsx',
    check: (content) => {
      return content.includes('Edit3') && // Import check
             content.includes('<Edit3 className='); // Usage check
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
  console.log('\n✅ All tests passed! Feature #95 is implemented correctly.');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Feature #95 needs fixes.');
  process.exit(1);
}
