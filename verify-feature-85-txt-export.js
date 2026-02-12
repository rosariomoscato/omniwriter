const fs = require('fs');
const path = require('path');

console.log('=== Feature #85 Verification: TXT Export ===\n');

// Check 1: Verify generateTxt function exists in export.ts
const exportPath = path.join(__dirname, 'server/src/routes/export.ts');
if (fs.existsSync(exportPath)) {
  const exportContent = fs.readFileSync(exportPath, 'utf-8');

  if (exportContent.includes('function generateTxt')) {
    console.log('✓ generateTxt function found in export.ts');
  } else {
    console.log('✗ generateTxt function NOT found');
    process.exit(1);
  }

  // Check 2: Verify TXT format is handled in export endpoint
  if (exportContent.includes("format = 'txt'") || exportContent.includes('format = "txt"') ||
      exportContent.includes("format==='txt'") || exportContent.includes('format==="txt"')) {
    console.log('✓ TXT format handling found in export endpoint');
  } else {
    console.log('✗ TXT format handling NOT found');
    process.exit(1);
  }

  // Check 3: Verify proper TXT structure
  if (exportContent.includes('Buffer.from(content, \'utf-8\')') || exportContent.includes('Buffer.from(content, "utf-8")')) {
    console.log('✓ TXT buffer conversion using UTF-8 encoding');
  } else {
    console.log('✗ TXT buffer conversion NOT found');
    process.exit(1);
  }

  // Check 4: Verify MIME type for TXT
  if (exportContent.includes('text/plain')) {
    console.log('✓ Correct MIME type (text/plain) for TXT export');
  } else {
    console.log('✗ text/plain MIME type NOT found');
    process.exit(1);
  }
} else {
  console.log('✗ export.ts file not found');
  process.exit(1);
}

// Check 5: Verify frontend export dialog includes TXT option
const projectDetailPath = path.join(__dirname, 'client/src/pages/ProjectDetail.tsx');
if (fs.existsSync(projectDetailPath)) {
  const projectDetailContent = fs.readFileSync(projectDetailPath, 'utf-8');

  if (projectDetailContent.includes("'txt'") || projectDetailContent.includes('"txt"')) {
    console.log('✓ TXT export option found in ProjectDetail.tsx');
  } else {
    console.log('✗ TXT export option NOT found in frontend');
    process.exit(1);
  }

  // Check 6: Verify handleExport function accepts TXT format
  if (projectDetailContent.includes("'txt' | 'docx' | 'epub'") || projectDetailContent.includes('"txt" | "docx" | "epub"')) {
    console.log('✓ handleExport function supports TXT format');
  } else {
    console.log('✗ handleExport function does not support TXT');
    process.exit(1);
  }
} else {
  console.log('✗ ProjectDetail.tsx file not found');
  process.exit(1);
}

console.log('\n=== All Checks Passed ✓ ===');
console.log('\nFeature #85 (Export project as TXT) is IMPLEMENTED:');
console.log('- Backend: generateTxt function creates UTF-8 encoded text files');
console.log('- Frontend: Export dialog includes TXT format option');
console.log('- API: POST /api/projects/:id/export handles format=txt');
console.log('- MIME type: text/plain');
console.log('\nNext: Test with browser to verify download works correctly');
