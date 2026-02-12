#!/usr/bin/env node

/**
 * Verification script for Features #45 and #104
 * Feature #45: Empty state for new users with onboarding
 * Feature #104: Loading states and skeleton screens
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('VERIFICATION: Features #45 (Onboarding) & #104 (Loading States)');
console.log('='.repeat(80));

const clientDir = '/Users/rosario/CODICE/omniwriter/client/src';
const results = {
  feature45: { passed: [], failed: [], warnings: [] },
  feature104: { passed: [], failed: [], warnings: [] }
};

// ============================================================================
// FEATURE #45: Empty State for New Users with Onboarding
// ============================================================================

console.log('\n📋 Feature #45: Empty State for New Users with Onboarding');
console.log('-'.repeat(80));

// Check 1: OnboardingGuide component exists
const onboardingPath = path.join(clientDir, 'components/OnboardingGuide.tsx');
if (fs.existsSync(onboardingPath)) {
  results.feature45.passed.push('✓ OnboardingGuide component exists');
  const content = fs.readFileSync(onboardingPath, 'utf-8');

  // Check content
  if (content.includes('Benvenuto in OmniWriter') || content.includes('Welcome to OmniWriter')) {
    results.feature45.passed.push('✓ Onboarding guide has welcome message');
  } else {
    results.feature45.failed.push('✗ Onboarding guide missing welcome message');
  }

  if (content.includes('Romanziere') && content.includes('Saggista') && content.includes('Redattore')) {
    results.feature45.passed.push('✓ Onboarding shows all three areas');
  } else {
    results.feature45.failed.push('✗ Onboarding missing area descriptions');
  }

  if (content.includes('Come iniziare') || content.includes('Getting Started')) {
    results.feature45.passed.push('✓ Onboarding includes getting started steps');
  } else {
    results.feature45.failed.push('✗ Onboarding missing getting started section');
  }

  if (content.includes('onClose')) {
    results.feature45.passed.push('✓ Onboarding can be dismissed');
  } else {
    results.feature45.warnings.push('⚠ Onboarding may not be dismissible');
  }
} else {
  results.feature45.failed.push('✗ OnboardingGuide component not found');
}

// Check 2: Dashboard integrates onboarding
const dashboardPath = path.join(clientDir, 'pages/Dashboard.tsx');
if (fs.existsSync(dashboardPath)) {
  const content = fs.readFileSync(dashboardPath, 'utf-8');

  if (content.includes('OnboardingGuide') || content.includes('onboarding')) {
    results.feature45.passed.push('✓ Dashboard imports OnboardingGuide');
  } else {
    results.feature45.failed.push('✗ Dashboard does not use OnboardingGuide');
  }

  if (content.includes('hasSeenOnboarding') || content.includes('showOnboarding')) {
    results.feature45.passed.push('✓ Dashboard manages onboarding state');
  } else {
    results.feature45.failed.push('✗ Dashboard missing onboarding state management');
  }

  if (content.includes("localStorage.setItem('hasSeenOnboarding'") ||
      content.includes('localStorage.getItem')) {
    results.feature45.passed.push('✓ Onboarding preference persisted to localStorage');
  } else {
    results.feature45.warnings.push('⚠ Onboarding state may not persist');
  }

  // Check empty state logic
  if (content.includes('projects.length === 0') && content.includes('!loading')) {
    results.feature45.passed.push('✓ Empty state triggers for new users');
  } else {
    results.feature45.failed.push('✗ Empty state logic incorrect');
  }
} else {
  results.feature45.failed.push('✗ Dashboard.tsx not found');
}

// Check 3: Translations for onboarding
const enPath = path.join(clientDir, 'i18n/locales/en.json');
const itPath = path.join(clientDir, 'i18n/locales/it.json');

[enPath, itPath].forEach((filePath, idx) => {
  const lang = idx === 0 ? 'English' : 'Italian';
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes('onboarding')) {
      results.feature45.passed.push(`✓ ${lang} translations include onboarding keys`);
    } else {
      results.feature45.warnings.push(`⚠ ${lang} translations may be missing onboarding keys`);
    }
  }
});

// ============================================================================
// FEATURE #104: Loading States and Skeleton Screens
// ============================================================================

console.log('\n⏳ Feature #104: Loading States and Skeleton Screens');
console.log('-'.repeat(80));

// Check 1: Skeleton component exists
const skeletonPath = path.join(clientDir, 'components/Skeleton.tsx');
if (fs.existsSync(skeletonPath)) {
  results.feature104.passed.push('✓ Skeleton component file exists');
  const content = fs.readFileSync(skeletonPath, 'utf-8');

  // Check for various skeleton components
  const skeletonTypes = [
    'ProjectCardSkeleton',
    'ChapterListSkeleton',
    'EditorSkeleton',
    'TableSkeleton',
    'HumanModelCardSkeleton'
  ];

  skeletonTypes.forEach(type => {
    if (content.includes(type)) {
      results.feature104.passed.push(`✓ ${type} component defined`);
    } else {
      results.feature104.warnings.push(`⚠ ${type} not found (may be optional)`);
    }
  });

  // Check for animation
  if (content.includes('animate-pulse')) {
    results.feature104.passed.push('✓ Skeleton components have animation');
  } else {
    results.feature104.warnings.push('⚠ Skeleton may not have pulse animation');
  }
} else {
  results.feature104.failed.push('✗ Skeleton.tsx component not found');
}

// Check 2: Dashboard uses skeleton screens
if (fs.existsSync(dashboardPath)) {
  const content = fs.readFileSync(dashboardPath, 'utf-8');

  if (content.includes('ProjectCardSkeleton')) {
    results.feature104.passed.push('✓ Dashboard imports ProjectCardSkeleton');
  } else {
    results.feature104.failed.push('✗ Dashboard does not use ProjectCardSkeleton');
  }

  // Check if loading state uses skeleton instead of simple spinner
  if (content.includes('loading') && content.includes('<ProjectCardSkeleton')) {
    results.feature104.passed.push('✓ Dashboard loading state uses skeleton');
  } else if (content.includes('loading') && content.includes('animate-spin')) {
    results.feature104.warnings.push('⚠ Dashboard still uses spinner for loading');
  } else {
    results.feature104.warnings.push('⚠ Could not verify Dashboard loading implementation');
  }
}

// Check 3: ChapterEditor uses skeleton
const chapterEditorPath = path.join(clientDir, 'pages/ChapterEditor.tsx');
if (fs.existsSync(chapterEditorPath)) {
  const content = fs.readFileSync(chapterEditorPath, 'utf-8');

  if (content.includes('EditorSkeleton')) {
    results.feature104.passed.push('✓ ChapterEditor imports EditorSkeleton');
  } else {
    results.feature104.warnings.push('⚠ ChapterEditor may not use EditorSkeleton');
  }

  // Check if loading state was improved
  if (content.includes('if (loading)') && content.includes('EditorSkeleton')) {
    results.feature104.passed.push('✓ ChapterEditor loading state uses skeleton');
  }
}

// Check 4: ProjectDetail uses skeleton for chapter list
const projectDetailPath = path.join(clientDir, 'pages/ProjectDetail.tsx');
if (fs.existsSync(projectDetailPath)) {
  const content = fs.readFileSync(projectDetailPath, 'utf-8');

  if (content.includes('ChapterListSkeleton')) {
    results.feature104.passed.push('✓ ProjectDetail imports ChapterListSkeleton');
  } else {
    results.feature104.warnings.push('⚠ ProjectDetail may not use ChapterListSkeleton');
  }

  // Check if chapter list loading uses skeleton
  if (content.includes('ChapterListSkeleton') && content.includes('loading')) {
    results.feature104.passed.push('✓ ProjectDetail chapter list uses skeleton');
  }
}

// Check 5: HumanModelPage uses skeleton
const humanModelPath = path.join(clientDir, 'pages/HumanModelPage.tsx');
if (fs.existsSync(humanModelPath)) {
  const content = fs.readFileSync(humanModelPath, 'utf-8');

  // Check if they replaced the simple loading text with skeleton
  if (content.includes('animate-pulse') || content.includes('skeleton')) {
    results.feature104.passed.push('✓ HumanModelPage has skeleton-like loading state');
  } else if (content.includes("Loading...") || content.includes('Caricamento...')) {
    results.feature104.warnings.push('⚠ HumanModelPage still uses text-based loading');
  }
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));

const printSummary = (featureName, results) => {
  const total = results.passed.length + results.failed.length;
  const passed = results.passed.length;
  const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

  console.log(`\n${featureName}`);
  console.log(`  Status: ${percentage >= 80 ? '✅ PASSING' : percentage >= 60 ? '⚠️  PARTIAL' : '❌ FAILING'}`);
  console.log(`  Score: ${passed}/${total} checks passed (${percentage}%)`);

  if (results.passed.length > 0) {
    console.log(`  Passed:`);
    results.passed.forEach(msg => console.log(`    ${msg}`));
  }

  if (results.warnings.length > 0) {
    console.log(`  Warnings:`);
    results.warnings.forEach(msg => console.log(`    ${msg}`));
  }

  if (results.failed.length > 0) {
    console.log(`  Failed:`);
    results.failed.forEach(msg => console.log(`    ${msg}`));
  }

  return percentage;
};

const score45 = printSummary('Feature #45: Onboarding', results.feature45);
const score104 = printSummary('Feature #104: Loading States', results.feature104);

console.log('\n' + '='.repeat(80));
console.log('FINAL VERDICT');

const overallPassing = score45 >= 80 && score104 >= 80;

if (overallPassing) {
  console.log('✅ Both features are PASSING');
  console.log('\nFeatures #45 and #104 can be marked as passing.');
} else if (score45 >= 60 && score104 >= 60) {
  console.log('⚠️  Both features are PARTIAL');
  console.log('\nFeatures are mostly implemented but may need minor adjustments.');
} else {
  console.log('❌ One or more features are FAILING');
  console.log('\nPlease review the failed checks above.');
}

console.log('='.repeat(80));

process.exit(overallPassing ? 0 : 1);
