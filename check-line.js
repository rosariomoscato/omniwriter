const fs = require('fs');
const content = fs.readFileSync('client/src/pages/Dashboard.tsx', 'utf8');
const lines = content.split('\n');

console.log('Line 936:', JSON.stringify(lines[935]));
console.log('Line 940:', JSON.stringify(lines[939]));
