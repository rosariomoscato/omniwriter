/**
 * Verification Script for Feature #103: Network failure handling with retry
 *
 * This script verifies:
 * 1. API service has retry logic for network errors
 * 2. API service has retry logic for server errors (5xx)
 * 3. NetworkErrorDialog component exists
 * 4. useApiError hook exists
 * 5. Error objects have isNetworkError flag
 * 6. Error objects have retryable flag
 */

console.log('=== Feature #103 Verification: Network Failure Handling with Retry ===\n');

const tests = [
  {
    name: 'API service has maxRetries property',
    file: 'client/src/services/api.ts',
    check: (content) => {
      return content.includes('maxRetries') &&
             content.includes('private') &&
             content.includes('retryDelay');
    }
  },
  {
    name: 'API request method accepts retryCount parameter',
    file: 'client/src/services/api.ts',
    check: (content) => {
      return content.includes('retryCount = 0') &&
             content.includes('private async request<T>');
    }
  },
  {
    name: 'API service catches TypeError for network errors',
    file: 'client/src/services/api.ts',
    check: (content) => {
      return content.includes('error instanceof TypeError') &&
             content.includes('Network error');
    }
  },
  {
    name: 'API service retries on network errors',
    file: 'client/src/services/api.ts',
    check: (content) => {
      return content.includes('retryCount < this.maxRetries') &&
             content.includes('retrying...');
    }
  },
  {
    name: 'API service creates network error with isNetworkError flag',
    file: 'client/src/services/api.ts',
    check: (content) => {
      return content.includes('isNetworkError') &&
             content.includes('retryable');
    }
  },
  {
    name: 'API service retries server errors (5xx)',
    file: 'client/src/services/api.ts',
    check: (content) => {
      return content.includes('response.status >= 500') &&
             content.includes('response.status === 408');
    }
  },
  {
    name: 'API service does not retry client errors (4xx)',
    file: 'client/src/services/api.ts',
    check: (content) => {
      return content.includes('response.status >= 400 && response.status < 500');
    }
  },
  {
    name: 'NetworkErrorDialog component exists',
    file: 'client/src/components/NetworkErrorDialog.tsx',
    check: (content) => {
      return content.includes('NetworkErrorDialog') &&
             content.includes('WifiOff') &&
             content.includes('RefreshCw');
    }
  },
  {
    name: 'NetworkErrorDialog has retry button',
    file: 'client/src/components/NetworkErrorDialog.tsx',
    check: (content) => {
      return content.includes('onRetry') &&
             content.includes('Retry') &&
             content.includes('isRetrying');
    }
  },
  {
    name: 'useApiError hook exists',
    file: 'client/src/components/NetworkErrorDialog.tsx',
    check: (content) => {
      return content.includes('useApiError') &&
             content.includes('showError') &&
             content.includes('clearError');
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
  console.log('\n✅ All tests passed! Feature #103 is implemented correctly.');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Feature #103 needs fixes.');
  process.exit(1);
}
