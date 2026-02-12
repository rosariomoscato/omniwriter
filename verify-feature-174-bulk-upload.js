/**
 * Verification Script for Feature #174: Bulk source upload progress tracking
 *
 * This script verifies:
 * 1. BulkSourceUpload component exists
 * 2. Component supports multiple file uploads
 * 3. Component shows progress bar per file
 * 4. Component shows overall progress
 * 5. Component shows completion notification
 */

console.log('=== Feature #174 Verification: Bulk Source Upload Progress Tracking ===\n');

const tests = [
  {
    name: 'BulkSourceUpload component exists',
    file: 'client/src/components/BulkSourceUpload.tsx',
    check: (content) => {
      return content.includes('BulkSourceUpload') &&
             content.includes('UploadProgress') &&
             content.includes('interface BulkSourceUploadProps');
    }
  },
  {
    name: 'Component supports multiple file uploads',
    file: 'client/src/components/BulkSourceUpload.tsx',
    check: (content) => {
      return content.includes('multiple') &&
             content.includes('FileList') &&
             content.includes('files.length');
    }
  },
  {
    name: 'Component has progress state per file',
    file: 'client/src/components/BulkSourceUpload.tsx',
    check: (content) => {
      return content.includes('progress:') &&
             content.includes('status:') &&
             content.includes('pending') &&
             content.includes('uploading') &&
             content.includes('success') &&
             content.includes('error');
    }
  },
  {
    name: 'Component shows progress bar per file',
    file: 'client/src/components/BulkSourceUpload.tsx',
    check: (content) => {
      return content.includes('w-16') &&
             content.includes('bg-gray-200') &&
             content.includes('rounded-full') &&
             content.includes('progress: 0') &&
             content.includes('progress: 100');
    }
  },
  {
    name: 'Component shows overall progress',
    file: 'client/src/components/BulkSourceUpload.tsx',
    check: (content) => {
      return content.includes('overallProgress') &&
             content.includes('Overall Progress') &&
             content.includes('h-2') &&
             content.includes('overallProgress}%');
    }
  },
  {
    name: 'Component shows status icons (uploading, success, error)',
    file: 'client/src/components/BulkSourceUpload.tsx',
    check: (content) => {
      return content.includes('Loader2') &&
             content.includes('CheckCircle') &&
             content.includes('AlertCircle') &&
             content.includes('getStatusIcon');
    }
  },
  {
    name: 'Component has completion notification',
    file: 'client/src/components/BulkSourceUpload.tsx',
    check: (content) => {
      return content.includes('onUploadComplete') &&
             content.includes('uploadedSources') &&
             content.includes('setTimeout');
    }
  },
  {
    name: 'Component validates file types',
    file: 'client/src/components/BulkSourceUpload.tsx',
    check: (content) => {
      return content.includes('validTypes') &&
             content.includes('validExtensions') &&
             content.includes('.pdf') &&
             content.includes('.docx');
    }
  },
  {
    name: 'Component has cancel functionality',
    file: 'client/src/components/BulkSourceUpload.tsx',
    check: (content) => {
      return content.includes('onCancel') &&
             content.includes('disabled={isProcessing}') &&
             content.includes('X className=');
    }
  },
  {
    name: 'Component shows upload more files button',
    file: 'client/src/components/BulkSourceUpload.tsx',
    check: (content) => {
      return content.includes('Upload More Files') &&
             content.includes('setUploads([])');
    }
  },
  {
    name: 'ProjectDetail imports BulkSourceUpload',
    file: 'client/src/pages/ProjectDetail.tsx',
    check: (content) => {
      return content.includes('import BulkSourceUpload') &&
             content.includes('../components/BulkSourceUpload');
    }
  },
  {
    name: 'ProjectDetail has showBulkUpload state',
    file: 'client/src/pages/ProjectDetail.tsx',
    check: (content) => {
      return content.includes('showBulkUpload') &&
             content.includes('setShowBulkUpload') &&
             content.includes("useState(false)");
    }
  },
  {
    name: 'ProjectDetail has bulk upload handler',
    file: 'client/src/pages/ProjectDetail.tsx',
    check: (content) => {
      return content.includes('handleBulkUploadComplete') &&
             content.includes('setSources([...sources') &&
             content.includes('toast.success');
    }
  },
  {
    name: 'ProjectDetail renders BulkSourceUpload component',
    file: 'client/src/pages/ProjectDetail.tsx',
    check: (content) => {
      return content.includes('<BulkSourceUpload') &&
             content.includes('showBulkUpload &&') &&
             content.includes('onUploadComplete={handleBulkUploadComplete}') &&
             content.includes('onCancel={() => setShowBulkUpload(false)}');
    }
  },
  {
    name: 'Upload button triggers bulk upload',
    file: 'client/src/pages/ProjectDetail.tsx',
    check: (content) => {
      return content.includes('Upload Sources') &&
             content.includes('onClick={() => setShowBulkUpload(true)}');
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
  console.log('\n✅ All tests passed! Feature #174 is implemented correctly.');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Feature #174 needs fixes.');
  process.exit(1);
}
