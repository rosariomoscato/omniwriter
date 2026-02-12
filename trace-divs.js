const fs = require('fs');
const content = fs.readFileSync('/Users/rosario/CODICE/omniwriter/client/src/pages/ChapterEditor.tsx', 'utf8');
const lines = content.split('\n');

let depth = 0;
const mainReturnStart = 718;

console.log('Line | Open | Close | Depth | Content');
console.log('-----|------|-------|-------|--------');

for (let i = mainReturnStart - 1; i < Math.min(lines.length, 1196); i++) {
  const line = lines[i];
  const lineNum = i + 1;

  // Count opening divs, excluding self-closing
  const openCount = (line.match(/<div(?![^>]*\/>)/g) || []).length;
  const closeCount = (line.match(/<\/div>/g) || []).length;

  if (openCount > 0 || closeCount > 0) {
    const beforeDepth = depth;
    depth += openCount - closeCount;
    const preview = line.trim().substring(0, 50);
    console.log(`${lineNum} | ${openCount} | ${closeCount} | ${beforeDepth}→${depth} | ${preview}`);
  }
}

console.log(`\nFinal depth: ${depth}`);
