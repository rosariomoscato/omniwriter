const fs = require('fs');
const content = fs.readFileSync('client/src/pages/Dashboard.tsx', 'utf8');
const line1009 = content.split('\n')[1008];

console.log('Line 1009 characters:');
for (let i = 0; i < line1009.length; i++) {
  const char = line1009[i];
  const code = char.charCodeAt(0);
  console.log(`  ${i}: '${char}' (code ${code})`);
}

// Check for specific sequence
const expected = 'if (pagination.totalPages <= 5) {';
console.log('\nExpected:', JSON.stringify(expected));
console.log('Actual:  ', JSON.stringify(line1009));
console.log('Match:', line1009 === expected);
