const fs = require('fs');
const content = fs.readFileSync('/Users/rosario/CODICE/omniwriter/client/src/pages/Dashboard.tsx', 'utf8');
const lines = content.split('\n');

let stack = [];
let inComment = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Track JSX comments
  if (line.includes('{/*')) inComment = true;
  if (line.includes('*/}')) inComment = false;

  // Count parentheses (excluding comments)
  let processLine = line;
  if (inComment && !line.includes('*/}')) {
    processLine = line.split('{/*')[0];
  }

  for (let char of processLine) {
    if (char === '(') stack.push({char: '(', line: i + 1});
    if (char === ')') {
      if (stack.length === 0) {
        console.log('Extra ) at line', i + 1);
      } else {
        const last = stack.pop();
        if (last.char !== '(') {
          console.log('Mismatch: line', i + 1, '- expected to close', last.char, 'found )');
        }
      }
    }
  }
}

if (stack.length > 0) {
  console.log('Unclosed parentheses:', stack.length);
  stack.slice(0, 10).forEach(s => console.log('  unclosed ( at line', s.line));
}
