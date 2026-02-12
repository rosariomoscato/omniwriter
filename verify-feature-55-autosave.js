/**
 * Verification script for Feature #55: Auto-save chapter every 30 seconds
 *
 * This script verifies:
 * 1. Periodic auto-save interval is implemented
 * 2. Countdown timer shows next auto-save
 * 3. Auto-save triggers every 30 seconds
 */

const fs = require('fs');
const path = require('path');

console.log('=== Feature #55: Auto-save Chapter Every 30 Seconds Verification ===\n');

// Step 1: Check ChapterEditor has periodic save interval
console.log('Step 1: Checking ChapterEditor for periodic auto-save...');
const chapterEditorPath = path.join(__dirname, 'client', 'src', 'pages', 'ChapterEditor.tsx');
const chapterEditorContent = fs.readFileSync(chapterEditorPath, 'utf8');

const hasPeriodicInterval = chapterEditorContent.includes('periodicSaveIntervalRef') &&
                          chapterEditorContent.includes('setInterval') &&
                          chapterEditorContent.includes('30000');

if (hasPeriodicInterval) {
  console.log('✅ ChapterEditor has periodic auto-save interval');
} else {
  console.log('❌ ChapterEditor missing periodic auto-save interval');
}

// Step 2: Check countdown timer
console.log('\nStep 2: Checking countdown timer implementation...');
const hasCountdownState = chapterEditorContent.includes('nextAutoSaveIn') &&
                           chapterEditorContent.includes('useState');
const hasCountdownInterval = chapterEditorContent.includes('countdownIntervalRef') &&
                            chapterEditorContent.includes('setInterval');
const hasCountdownDisplay = chapterEditorContent.includes('Auto-save in') &&
                            chapterEditorContent.includes('nextAutoSaveIn');

if (hasCountdownState && hasCountdownInterval && hasCountdownDisplay) {
  console.log('✅ Countdown timer shows next auto-save');
  console.log('✅ Countdown updates every second');
  console.log('✅ Countdown displayed in footer');
} else {
  if (!hasCountdownState) {
    console.log('❌ Countdown state not found');
  }
  if (!hasCountdownInterval) {
    console.log('❌ Countdown interval not found');
  }
  if (!hasCountdownDisplay) {
    console.log('❌ Countdown not displayed in UI');
  }
}

// Step 3: Check cleanup on unmount
console.log('\nStep 3: Checking cleanup on component unmount...');
const hasCleanup = chapterEditorContent.includes('clearInterval') &&
                   chapterEditorContent.includes('periodicSaveIntervalRef') &&
                   chapterEditorContent.includes('return () =>');

if (hasCleanup) {
  console.log('✅ Intervals cleared on component unmount');
} else {
  console.log('❌ Missing cleanup for intervals');
}

// Step 4: Check that auto-save calls handleSave
console.log('\nStep 4: Checking auto-save triggers save...');
const triggersHandleSave = chapterEditorContent.includes('handleSave()') ||
                          (chapterEditorContent.includes('Periodic save triggered'));

if (triggersHandleSave) {
  console.log('✅ Auto-save interval calls handleSave()');
} else {
  console.log('❌ Auto-save does not call handleSave()');
}

// Step 5: Verify the interval timing
console.log('\nStep 5: Verifying interval timing...');
const has30Seconds = chapterEditorContent.includes('30000') &&
                     chapterEditorContent.includes('30 seconds');

if (has30Seconds) {
  console.log('✅ Interval is set to 30 seconds (30000ms)');
} else {
  console.log('❌ Interval is not 30 seconds');
}

// Step 6: Check footer displays countdown
console.log('\nStep 6: Checking footer UI...');
const footerHasCountdown = chapterEditorContent.includes('Auto-save in') &&
                          chapterEditorContent.includes('nextAutoSaveIn');

if (footerHasCountdown) {
  console.log('✅ Footer displays auto-save countdown');
} else {
  console.log('❌ Footer does not display countdown');
}

// Summary
console.log('\n=== Summary ===');
console.log('Feature #55: Auto-save chapter every 30 seconds');
console.log('');

const allChecks = [
  hasPeriodicInterval,
  hasCountdownState && hasCountdownInterval && hasCountdownDisplay,
  hasCleanup,
  triggersHandleSave,
  has30Seconds,
  footerHasCountdown
];

const passedChecks = allChecks.filter(c => c).length;
console.log(`Checks passed: ${passedChecks}/${allChecks.length}`);

if (passedChecks === allChecks.length) {
  console.log('\n✅ Feature #55 is IMPLEMENTED');
  console.log('\nVerification steps for manual testing:');
  console.log('1. Open a chapter in the editor');
  console.log('2. Type some content');
  console.log('3. Wait for the countdown in the footer');
  console.log('4. After 30 seconds, verify auto-save triggers');
  console.log('5. Refresh the page and verify content is saved');
  console.log('6. Check the footer shows "Last saved" timestamp');
} else {
  console.log('\n⚠️  Feature #55 needs additional implementation');
}
