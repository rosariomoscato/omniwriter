const fs = require('fs');

const filePath = '/Users/rosario/CODICE/omniwriter/client/src/pages/Dashboard.tsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find unclosed opening parentheses before line 988
let parenCount = 0;
let braceCount = 0;
let inJSX = false;

for (let i = 0; i < 987; i++) {
  const line = lines[i];
  const inString = /(^[^"']|[^\\](['"]))(?:\2.)*?\2/g;

  for (let char of line) {
    // Simple counter - not perfect but should give us a clue
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
  }
}

console.log(`Before line 988: parentheses balance = ${parenCount}, braces balance = ${braceCount}`);
console.log('');
console.log('Lines 983-990:');
for (let i = 982; i < 990 && i < lines.length; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
