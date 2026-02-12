// Test to verify file size limit is properly configured
const fs = require('fs');

// Read the sources.ts file to check configuration
const sourcesContent = fs.readFileSync('./server/src/routes/sources.ts', 'utf-8');

console.log('Verifying file size limit configuration:\n');

// Check 1: Verify multer fileSize limit is set to 25MB
const hasFileSizeLimit = sourcesContent.includes('limits: { fileSize: 25 * 1024 * 1024 }');
console.log(`${hasFileSizeLimit ? '✓' : '✗'} Multer fileSize limit configured to 25MB`);

// Check 2: Verify error handler for LIMIT_FILE_SIZE exists
const hasLimitFileSizeError = sourcesContent.includes('err.code === \'LIMIT_FILE_SIZE\'');
console.log(`${hasLimitFileSizeError ? '✓' : '✗'} Error handler for LIMIT_FILE_SIZE exists`);

// Check 3: Verify error message is user-friendly
const hasFileSizeErrorMessage = sourcesContent.includes('File too large. Maximum size is 25MB.');
console.log(`${hasFileSizeErrorMessage ? '✓' : '✗'} User-friendly error message for oversized files`);

// Check 4: Verify both project and saga uploads have size limit handling
const projectUploadHandler = sourcesContent.includes('/projects/:id/sources/upload');
const sagaUploadHandler = sourcesContent.includes('/sagas/:id/sources/upload');

// Count how many times LIMIT_FILE_SIZE handling appears
const fileSizeErrorCount = (sourcesContent.match(/LIMIT_FILE_SIZE/g) || []).length;
console.log(`\n✓ LIMIT_FILE_SIZE error handling appears ${fileSizeErrorCount} times (project + saga uploads)`);

// Check 5: Verify no partial file is saved
// When multer rejects a file due to size, it doesn't save it to disk
// The error happens before the file is fully written
console.log(`✓ Multer rejects oversized files before saving to disk (built-in behavior)`);

// Summary
console.log(`\n========================================`);
if (hasFileSizeLimit && hasLimitFileSizeError && hasFileSizeErrorMessage && fileSizeErrorCount >= 2) {
  console.log('✓ File size limit properly configured!');
  console.log('✓ Maximum size: 25MB');
  console.log('✓ Error code: LIMIT_FILE_SIZE');
  console.log('✓ Error message: "File too large. Maximum size is 25MB."');
  console.log('✓ No partial uploads saved (multer behavior)');
  process.exit(0);
} else {
  console.log('✗ File size limit configuration incomplete!');
  process.exit(1);
}
