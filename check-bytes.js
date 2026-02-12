const fs = require('fs');
const content = fs.readFileSync('/Users/rosario/CODICE/omniwriter/client/src/pages/Dashboard.tsx', 'utf8');
const lines = content.split('\n');

// Check for invisible characters in template literals
console.log('Line 855 (getAreaColor):');
console.log(JSON.stringify(lines[854]));
console.log('');
console.log('Line 856:');
console.log(JSON.stringify(lines[855]));
console.log('');
console.log('Line 857:');
console.log(JSON.stringify(lines[856]));
