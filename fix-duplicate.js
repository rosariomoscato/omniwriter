const fs = require('fs');
const file = '/Users/rosario/CODICE/omniwriter/client/src/pages/ChapterEditor.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// Remove lines 622-658 (0-indexed: 621-657) which contain the duplicate
const newLines = [...lines.slice(0, 621), ...lines.slice(658)];
fs.writeFileSync(file, newLines.join('\n'));
console.log('Removed duplicate handleTextSelection declaration (lines 622-658)');
