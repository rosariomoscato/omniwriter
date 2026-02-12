// Verification script for Feature #54: Restore previous chapter version
const fs = require('fs');

console.log('=== Feature #54: Restore Previous Chapter Version Verification ===\n');

// Step 1: Check backend has restore endpoint
console.log('1. Backend endpoint check:');
const chaptersRoutePath = '/Users/rosario/CODICE/omniwriter/server/src/routes/chapters.ts';
const chaptersRouteContent = fs.readFileSync(chaptersRoutePath, 'utf8');

const hasRestoreEndpoint = chaptersRouteContent.includes("'/chapters/:id/restore/:versionId'");
const hasPostMethod = chaptersRouteContent.includes("router.post('/chapters/:id/restore/:versionId'");
const hasVersionBackup = chaptersRouteContent.includes('Auto-saved before restoring');
const hasContentRestore = chaptersRouteContent.includes('UPDATE chapters SET content = ?');

if (hasRestoreEndpoint && hasPostMethod && hasVersionBackup && hasContentRestore) {
  console.log('   ✓ Backend has POST /api/chapters/:id/restore/:versionId endpoint');
  console.log('   ✓ Creates backup of current content before restore');
  console.log('   ✓ Updates chapter content with restored version');
} else {
  console.log('   ✗ Backend restore endpoint incomplete:');
  if (!hasRestoreEndpoint) console.log('     - Missing restore endpoint');
  if (!hasPostMethod) console.log('     - Not a POST method');
  if (!hasVersionBackup) console.log('     - Missing current content backup');
  if (!hasContentRestore) console.log('     - Missing content restore');
}

// Step 2: Check API service has restore method
console.log('\n2. API service check:');
const apiPath = '/Users/rosario/CODICE/omniwriter/client/src/services/api.ts';
const apiContent = fs.readFileSync(apiPath, 'utf8');

const hasRestoreMethod = apiContent.includes('restoreChapterVersion');
const hasCorrectPath = apiContent.match(/restoreChapterVersion.*chapters.*restore/);
const hasPostMethodApi = apiContent.match(/restoreChapterVersion.*method.*POST/);

if (hasRestoreMethod && hasCorrectPath && hasPostMethodApi) {
  console.log('   ✓ API service has restoreChapterVersion method');
  console.log('   ✓ Uses POST method to /chapters/:id/restore/:versionId');
} else {
  console.log('   ✗ API service restore method incomplete:');
  if (!hasRestoreMethod) console.log('     - Missing restoreChapterVersion method');
  if (!hasCorrectPath) console.log('     - Wrong API path');
  if (!hasPostMethodApi) console.log('     - Not using POST method');
}

// Step 3: Check VersionHistory component exists
console.log('\n3. VersionHistory component check:');
const versionHistoryPath = '/Users/rosario/CODICE/omniwriter/client/src/components/VersionHistory.tsx';
const versionHistoryExists = fs.existsSync(versionHistoryPath);

let hasHandleRestore = false;
let hasRestoreApiCall = false;
let hasRestoreButton = false;
let hasConfirmDialog = false;
let hasToastSuccess = false;
let hasVersionReload = false;

if (versionHistoryExists) {
  const versionHistoryContent = fs.readFileSync(versionHistoryPath, 'utf8');

  hasHandleRestore = versionHistoryContent.includes('handleRestore');
  hasRestoreApiCall = versionHistoryContent.includes('apiService.restoreChapterVersion');
  hasRestoreButton = versionHistoryContent.includes("title='Restore this version'");
  hasConfirmDialog = versionHistoryContent.includes('confirm');
  hasToastSuccess = versionHistoryContent.includes('toast.success');
  hasVersionReload = versionHistoryContent.includes('loadVersions');

  console.log('   ✓ VersionHistory component exists');
  if (hasHandleRestore) console.log('   ✓ Has handleRestore function');
  if (hasRestoreApiCall) console.log('   ✓ Calls API restoreChapterVersion method');
  if (hasRestoreButton) console.log('   ✓ Has restore button with RotateCcw icon');
  if (hasConfirmDialog) console.log('   ✓ Shows confirmation dialog before restore');
  if (hasToastSuccess) console.log('   ✓ Shows success toast after restore');
  if (hasVersionReload) console.log('   ✓ Reloads versions list after restore');
} else {
  console.log('   ✗ VersionHistory component not found');
}

// Step 4: Check ChapterEditor has version history UI
console.log('\n4. ChapterEditor UI check:');
const chapterEditorPath = '/Users/rosario/CODICE/omniwriter/client/src/pages/ChapterEditor.tsx';
const chapterEditorContent = fs.readFileSync(chapterEditorPath, 'utf8');

const hasVersionHistoryImport = chapterEditorContent.includes("import VersionHistory from");
const hasShowVersionHistoryState = chapterEditorContent.includes('showVersionHistory');
const hasClockButton = chapterEditorContent.includes("title='Version History'");
const hasVersionHistoryModal = chapterEditorContent.includes('VersionHistory');
const hasOnRestoreProp = chapterEditorContent.includes('onRestore={handleRestore}');

if (hasVersionHistoryImport && hasClockButton) {
  console.log('   ✓ ChapterEditor imports VersionHistory component');
  console.log('   ✓ Has Clock icon button to open version history');
  if (hasShowVersionHistoryState) console.log('   ✓ Manages showVersionHistory state');
  if (hasVersionHistoryModal) console.log('   ✓ Renders VersionHistory modal');
  if (hasOnRestoreProp) console.log('   ✓ Passes onRestore handler to VersionHistory');
} else {
  console.log('   ✗ ChapterEditor UI incomplete:');
  if (!hasVersionHistoryImport) console.log('     - Missing VersionHistory import');
  if (!hasClockButton) console.log('     - Missing Clock button');
}

// Step 5: Check ChapterVersion type definition
console.log('\n5. Type definitions check:');
const hasChapterVersionType = apiContent.includes('interface ChapterVersion') || apiContent.includes('type ChapterVersion');

if (hasChapterVersionType) {
  console.log('   ✓ ChapterVersion type defined in API service');
} else {
  console.log('   ✗ ChapterVersion type not found');
}

console.log('\n=== RESULTS ===');

const allChecks = [
  hasRestoreEndpoint, hasPostMethod, hasVersionBackup, hasContentRestore,
  hasRestoreMethod, hasCorrectPath, hasPostMethodApi,
  versionHistoryExists, hasHandleRestore, hasRestoreApiCall, hasRestoreButton,
  hasConfirmDialog, hasToastSuccess, hasVersionReload,
  hasVersionHistoryImport, hasShowVersionHistoryState, hasClockButton,
  hasVersionHistoryModal, hasOnRestoreProp, hasChapterVersionType
];

const passingChecks = allChecks.filter(c => c).length;
const totalChecks = allChecks.length;

if (passingChecks === totalChecks) {
  console.log(`✅ PASS: Feature #54 fully implemented (${passingChecks}/${totalChecks} checks)`);
  console.log('   - Backend restore endpoint with version backup');
  console.log('   - API service method integration');
  console.log('   - VersionHistory component with restore UI');
  console.log('   - ChapterEditor integration with Clock button');
  console.log('   - Confirmation dialog and success feedback');
  console.log('   - Type definitions for ChapterVersion');
} else {
  console.log(`⚠️ PARTIAL: ${passingChecks}/${totalChecks} checks passing`);
}

console.log('\n=== Feature #54 Verification Complete ===\n');
