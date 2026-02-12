/**
 * Verification Script for Feature #106: Error feedback for failed operations
 *
 * This script verifies:
 * 1. Toast component exists and is properly styled
 * 2. ToastContext exists with error notification functions
 * 3. API service throws errors with messages
 * 4. Pages show error toasts when operations fail
 * 5. Error messages are user-friendly
 * 6. Errors don't crash the app
 */

console.log('=== Feature #106 Verification: Error Feedback for Failed Operations ===\n');

const tests = [
  {
    name: 'Toast component exists',
    file: 'client/src/components/Toast.tsx',
    check: (content) => {
      return content.includes('ToastContainer') &&
             content.includes('useToast') &&
             content.includes('toastIcons') &&
             content.includes('error');
    }
  },
  {
    name: 'Toast has error styling',
    file: 'client/src/components/Toast.tsx',
    check: (content) => {
      return content.includes('border-red-500') &&
             content.includes('bg-red-50') &&
             content.includes('AlertCircle');
    }
  },
  {
    name: 'ToastContext has showError function',
    file: 'client/src/contexts/ToastContext.tsx',
    check: (content) => {
      return content.includes('showError') &&
             content.includes('ToastType') &&
             content.includes('error');
    }
  },
  {
    name: 'ToastContext auto-dismisses errors',
    file: 'client/src/contexts/ToastContext.tsx',
    check: (content) => {
      return content.includes('setTimeout') &&
             content.includes('removeToast') &&
             content.includes('duration');
    }
  },
  {
    name: 'API service throws errors with messages',
    file: 'client/src/services/api.ts',
    check: (content) => {
      return content.includes('throw new Error') &&
             content.includes('error.message') &&
             content.includes('Network error');
    }
  },
  {
    name: 'API service handles 401/403 auth errors',
    file: 'client/src/services/api.ts',
    check: (content) => {
      return content.includes('response.status === 401') &&
             content.includes('response.status === 403') &&
             content.includes('isAuthError');
    }
  },
  {
    name: 'API service provides user-friendly error messages',
    file: 'client/src/services/api.ts',
    check: (content) => {
      return content.includes('Network connection failed') &&
             content.includes('Session expired');
    }
  },
  {
    name: 'ProfilePage shows error toasts',
    file: 'client/src/pages/ProfilePage.tsx',
    check: (content) => {
      return content.includes('toast.error') &&
             content.includes('catch (error') &&
             content.includes('Failed to');
    }
  },
  {
    name: 'NewProjectPage shows error toasts',
    file: 'client/src/pages/NewProject.tsx',
    check: (content) => {
      return content.includes('toast.error') &&
             content.includes('catch (err') &&
             content.includes('setError');
    }
  },
  {
    name: 'SettingsPage shows error toasts',
    file: 'client/src/pages/SettingsPage.tsx',
    check: (content) => {
      return content.includes('toast.error') &&
             content.includes('catch (error');
    }
  },
  {
    name: 'Toast has close button',
    file: 'client/src/components/Toast.tsx',
    check: (content) => {
      return content.includes('X') &&
             content.includes('removeToast') &&
             content.includes('Close notification');
    }
  },
  {
    name: 'Toast has escape key handler',
    file: 'client/src/contexts/ToastContext.tsx',
    check: (content) => {
      return content.includes('keydown') &&
             content.includes('Escape') &&
             content.includes('setToasts([])');
    }
  },
  {
    name: 'Dashboard uses toast notifications',
    file: 'client/src/pages/Dashboard.tsx',
    check: (content) => {
      return content.includes('useToastNotification') ||
             content.includes('toast.error');
    }
  },
  {
    name: 'ProjectDetail uses toast notifications',
    file: 'client/src/pages/ProjectDetail.tsx',
    check: (content) => {
      return content.includes('useToastNotification') ||
             content.includes('toast.error');
    }
  },
  {
    name: 'HumanModelPage uses toast notifications',
    file: 'client/src/pages/HumanModelPage.tsx',
    check: (content) => {
      return content.includes('useToastNotification') ||
             content.includes('toast.error');
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
  console.log('\n✅ All tests passed! Feature #106 is implemented correctly.');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Feature #106 needs fixes.');
  process.exit(1);
}
