const { execSync } = require('child_process');
const content = execSync('git show HEAD:client/src/pages/Dashboard.tsx', { encoding: 'utf8' });
const lines = content.split('\n');
console.log('Git HEAD - Line 936:', JSON.stringify(lines[935]));
console.log('Git HEAD - Line 940:', JSON.stringify(lines[939]));
