#!/usr/bin/env node

/**
 * Verification script for Features #9 and #10
 * Feature #9: Breadcrumb navigation works on nested pages
 * Feature #10: Landing page renders for unauthenticated users
 */

const fs = require('fs');
const path = require('path');

const landingPagePath = path.join(__dirname, 'client/src/pages/LandingPage.tsx');
const breadcrumbsPath = path.join(__dirname, 'client/src/components/Breadcrumbs.tsx');
const appPath = path.join(__dirname, 'client/src/App.tsx');

console.log('='.repeat(60));
console.log('Verifying Features #9 and #10');
console.log('='.repeat(60));

// Feature #10: Landing Page Verification
console.log('\n📋 Feature #10: Landing page renders for unauthenticated users');
console.log('-'.repeat(60));

const landingPageContent = fs.readFileSync(landingPagePath, 'utf8');
const requiredSections = [
  'Hero Section',
  'Features Showcase',
  'Pricing Section',
  'CTA Section'
];

const feature10Checks = {
  heroSection: landingPageContent.includes('Hero Section'),
  featuresShowcase: landingPageContent.includes('Features Showcase'),
  pricingSection: landingPageContent.includes('Pricing Section'),
  ctaSection: landingPageContent.includes('CTA Section'),
  hasCTAButtons: landingPageContent.includes('Inizia Gratis') && landingPageContent.includes('Accedi'),
  hasFeaturesCards: landingPageContent.includes('Romanziere') && landingPageContent.includes('Saggista') && landingPageContent.includes('Redattore'),
  hasPricingPlans: landingPageContent.includes('Free') && landingPageContent.includes('Premium') && landingPageContent.includes('Lifetime'),
  hasFooter: landingPageContent.includes('© 2025 OmniWriter')
};

console.log('Landing Page Checks:');
console.log(`  ✓ Hero Section: ${feature10Checks.heroSection ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ Features Showcase: ${feature10Checks.featuresShowcase ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ Pricing Section: ${feature10Checks.pricingSection ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ CTA Section: ${feature10Checks.ctaSection ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ CTA Buttons: ${feature10Checks.hasCTAButtons ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ Feature Cards: ${feature10Checks.hasFeaturesCards ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ Pricing Plans: ${feature10Checks.hasPricingPlans ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ Footer: ${feature10Checks.hasFooter ? 'PASS' : 'FAIL'}`);

const feature10Passing = Object.values(feature10Checks).every(v => v === true);
console.log(`\nFeature #10 Status: ${feature10Passing ? '✅ PASSING' : '❌ FAILING'}`);

// Feature #9: Breadcrumb Verification
console.log('\n📋 Feature #9: Breadcrumb navigation works on nested pages');
console.log('-'.repeat(60));

const breadcrumbsContent = fs.readFileSync(breadcrumbsPath, 'utf8');
const appContent = fs.readFileSync(appPath, 'utf8');

const feature9Checks = {
  breadcrumbsComponentExists: fs.existsSync(breadcrumbsPath),
  breadcrumbsExportsDefault: breadcrumbsContent.includes('export default function Breadcrumbs'),
  breadcrumbsUseLocation: breadcrumbsContent.includes('useLocation'),
  breadcrumbsDashboardLink: breadcrumbsContent.includes("'Dashboard'") || breadcrumbsContent.includes('"Dashboard"'),
  breadcrumbsProjectsLink: breadcrumbsContent.includes("'Progetti'") || breadcrumbsContent.includes('"Progetti"'),
  breadcrumbsProjectLink: breadcrumbsContent.includes("'Progetto'") || breadcrumbsContent.includes('"Progetto"'),
  breadcrumbsClickable: breadcrumbsContent.includes('<Link'),
  breadcrumbsSeparator: breadcrumbsContent.includes('svg') && breadcrumbsContent.includes('fill'),
  dashboardHasBreadcrumbs: fs.readFileSync(path.join(__dirname, 'client/src/pages/Dashboard.tsx'), 'utf8').includes('Breadcrumbs'),
  projectDetailExists: fs.existsSync(path.join(__dirname, 'client/src/pages/ProjectDetail.tsx')),
  projectDetailHasBreadcrumbs: fs.readFileSync(path.join(__dirname, 'client/src/pages/ProjectDetail.tsx'), 'utf8').includes('Breadcrumbs'),
  appHasProjectDetailRoute: appContent.includes('<Route path="/projects/:id"')
};

console.log('Breadcrumb Checks:');
console.log(`  ✓ Breadcrumbs Component Exists: ${feature9Checks.breadcrumbsComponentExists ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ Exports Default: ${feature9Checks.breadcrumbsExportsDefault ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ Uses useLocation: ${feature9Checks.breadcrumbsUseLocation ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ Dashboard Link: ${feature9Checks.breadcrumbsDashboardLink ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ Projects Link: ${feature9Checks.breadcrumbsProjectsLink ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ Project Link: ${feature9Checks.breadcrumbsProjectLink ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ Clickable Links: ${feature9Checks.breadcrumbsClickable ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ Separators: ${feature9Checks.breadcrumbsSeparator ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ Dashboard Has Breadcrumbs: ${feature9Checks.dashboardHasBreadcrumbs ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ ProjectDetail Exists: ${feature9Checks.projectDetailExists ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ ProjectDetail Has Breadcrumbs: ${feature9Checks.projectDetailHasBreadcrumbs ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ ProjectDetail Route: ${feature9Checks.appHasProjectDetailRoute ? 'PASS' : 'FAIL'}`);

const feature9Passing = Object.values(feature9Checks).every(v => v === true);
console.log(`\nFeature #9 Status: ${feature9Passing ? '✅ PASSING' : '❌ FAILING'}`);

// Summary
console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`Feature #9 (Breadcrumbs): ${feature9Passing ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Feature #10 (Landing Page): ${feature10Passing ? '✅ PASS' : '❌ FAIL'}`);
console.log('='.repeat(60));

if (feature9Passing && feature10Passing) {
  console.log('\n✅ All features are passing!');
  process.exit(0);
} else {
  console.log('\n❌ Some features are failing. Please review.');
  process.exit(1);
}
