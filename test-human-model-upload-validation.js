// Test script to verify Human Model upload validation logic
// This simulates the validation in human-models.ts

const path = require('path');

// Allowed file types from human-models.ts
const allowedTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/rtf',
  'text/plain',
];
const validExtensions = ['.pdf', '.docx', '.doc', '.rtf', '.txt'];

// Test files for Human Model uploads
const testFiles = [
  { name: 'writing.pdf', mime: 'application/pdf', ext: '.pdf', shouldPass: true },
  { name: 'writing.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: '.docx', shouldPass: true },
  { name: 'writing.txt', mime: 'text/plain', ext: '.txt', shouldPass: true },
  { name: 'malware.exe', mime: 'application/x-msdownload', ext: '.exe', shouldPass: false },
  { name: 'image.jpg', mime: 'image/jpeg', ext: '.jpg', shouldPass: false },
  { name: 'script.js', mime: 'text/javascript', ext: '.js', shouldPass: false },
];

console.log('Testing Human Model upload validation logic:\n');

let passed = 0;
let failed = 0;

testFiles.forEach(file => {
  const isValidMimeType = allowedTypes.includes(file.mime);
  const isValidExtension = validExtensions.includes(file.ext);
  // Logic: Invalid only if BOTH MIME type AND extension are invalid
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
  console.log('✓ All Human Model upload validation tests passed!');
  process.exit(0);
} else {
  console.log(`✗ ${failed} test(s) failed!`);
  process.exit(1);
}
