// Test script to verify file upload validation logic
// This simulates the multer fileFilter behavior

const path = require('path');

// Allowed file types from sources.ts
const allowedTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/rtf',
  'text/plain',
];
const validExtensions = ['.pdf', '.docx', '.doc', '.rtf', '.txt'];

// Test files
const testFiles = [
  { name: 'document.pdf', mime: 'application/pdf', ext: '.pdf', shouldPass: true },
  { name: 'document.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: '.docx', shouldPass: true },
  { name: 'document.txt', mime: 'text/plain', ext: '.txt', shouldPass: true },
  { name: 'malware.exe', mime: 'application/x-msdownload', ext: '.exe', shouldPass: false },
  { name: 'image.jpg', mime: 'image/jpeg', ext: '.jpg', shouldPass: false },
  { name: 'script.js', mime: 'text/javascript', ext: '.js', shouldPass: false },
  { name: 'archive.zip', mime: 'application/zip', ext: '.zip', shouldPass: false },
  { name: 'movie.mp4', mime: 'video/mp4', ext: '.mp4', shouldPass: false },
];

console.log('Testing file upload validation logic:\n');

let passed = 0;
let failed = 0;

testFiles.forEach(file => {
  const isValidMimeType = allowedTypes.includes(file.mime);
  const isValidExtension = validExtensions.includes(file.ext);
  const wouldPass = isValidMimeType || isValidExtension;

  const status = wouldPass === file.shouldPass ? '✓' : '✗';
  const result = wouldPass === file.shouldPass ? 'PASS' : 'FAIL';

  if (wouldPass === file.shouldPass) {
    passed++;
  } else {
    failed++;
  }

  console.log(`${status} ${file.name.padEnd(20)} | MIME: ${file.mime.padEnd(50)} | Expected: ${file.shouldPass ? 'ALLOW' : 'REJECT'.padEnd(6)} | Got: ${wouldPass ? 'ALLOW' : 'REJECT'} | ${result}`);
});

console.log(`\n========================================`);
console.log(`Results: ${passed}/${testFiles.length} tests passed`);
console.log(`========================================`);

if (failed === 0) {
  console.log('✓ All file validation tests passed!');
  process.exit(0);
} else {
  console.log(`✗ ${failed} test(s) failed!`);
  process.exit(1);
}
