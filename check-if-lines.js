const fs = require('fs');
const content = fs.readFileSync('client/src/pages/Dashboard.tsx', 'utf8');
const lines = content.split('\n');

console.log('Line 1009:', JSON.stringify(lines[1008]));
console.log('Line 1010:', JSON.stringify(lines[1009]));
console.log('Line 1011:', JSON.stringify(lines[1010]));
console.log('Line 1012:', JSON.stringify(lines[1011]));
console.log('Line 1013:', JSON.stringify(lines[1012]));
console.log('Line 1014:', JSON.stringify(lines[1013]));
console.log('Line 1015:', JSON.stringify(lines[1014]));
