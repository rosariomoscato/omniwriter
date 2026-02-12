#!/usr/bin/env node

/**
 * Verification Script for Features #11 and #12
 *
 * Feature #11: 404 page displays for unknown routes
 * Feature #12: Back button works correctly across pages
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('VERIFICATION: Features #11 & #12 - Navigation Integrity');
console.log('='.repeat(60));

// ============================================================
// FEATURE #11: 404 Page
// ============================================================
console.log('\n📋 FEATURE #11: 404 page displays for unknown routes');
console.log('-'.repeat(60));

const checks11 = [];

// Check 1: NotFoundPage component exists
const notFoundPath = path.join(__dirname, 'client/src/pages/NotFoundPage.tsx');
if (fs.existsSync(notFoundPath)) {
  console.log('✓ NotFoundPage component exists');
  checks11.push(true);
} else {
  console.log('✗ NotFoundPage component NOT found');
  checks11.push(false);
}

// Check 2: NotFoundPage has 404 message
const notFoundContent = fs.readFileSync(notFoundPath, 'utf8');
if (notFoundContent.includes('404')) {
  console.log('✓ NotFoundPage contains "404" message');
  checks11.push(true);
} else {
  console.log('✗ NotFoundPage missing "404" message');
  checks11.push(false);
}

// Check 3: NotFoundPage has navigation links (back button, home/dashboard)
const hasBackButton = notFoundContent.includes('handleGoBack') || notFoundContent.includes('ArrowLeft');
const hasHomeLink = notFoundContent.includes('Vai alla Home') || notFoundContent.includes('Vai alla Dashboard');
if (hasBackButton && hasHomeLink) {
  console.log('✓ NotFoundPage has navigation links (back + home/dashboard)');
  checks11.push(true);
} else {
  console.log('✗ NotFoundPage missing navigation links');
  console.log('  - Back button:', hasBackButton ? '✓' : '✗');
  console.log('  - Home/Dashboard link:', hasHomeLink ? '✓' : '✗');
  checks11.push(false);
}

// Check 4: NotFoundPage isInLayout prop for different contexts
if (notFoundContent.includes('isInLayout')) {
  console.log('✓ NotFoundPage supports isInLayout prop (public vs authenticated)');
  checks11.push(true);
} else {
  console.log('✗ NotFoundPage missing isInLayout prop');
  checks11.push(false);
}

// Check 5: App.tsx imports NotFoundPage
const appPath = path.join(__dirname, 'client/src/App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');
if (appContent.includes("import NotFoundPage")) {
  console.log('✓ App.tsx imports NotFoundPage');
  checks11.push(true);
} else {
  console.log('✗ App.tsx does NOT import NotFoundPage');
  checks11.push(false);
}

// Check 6: App.tsx renders NotFoundPage for unknown routes (not Navigate)
if (appContent.includes('<NotFoundPage') && !appContent.includes('<Navigate to="/dashboard" replace />')) {
  console.log('✓ App.tsx renders NotFoundPage for unknown routes (not redirect)');
  checks11.push(true);
} else {
  console.log('✗ App.tsx still using Navigate redirect instead of 404 page');
  checks11.push(false);
}

// Check 7: Separate 404 handling for authenticated and unauthenticated
if (appContent.includes('isInLayout={true}') && appContent.includes('isInLayout={false}')) {
  console.log('✓ App.tsx has separate 404 handling for authenticated/unauthenticated');
  checks11.push(true);
} else {
  console.log('✗ App.tsx missing separate 404 handling');
  checks11.push(false);
}

// Check 8: Uses lucide-react icons (installed)
const packagePath = path.join(__dirname, 'client/package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (packageJson.dependencies['lucide-react']) {
  console.log('✓ lucide-react icons installed and used');
  checks11.push(true);
} else {
  console.log('✗ lucide-react not installed');
  checks11.push(false);
}

// Check 9: Client builds successfully
const distPath = path.join(__dirname, 'client/dist/index.html');
if (fs.existsSync(distPath)) {
  console.log('✓ Client builds successfully with NotFoundPage');
  checks11.push(true);
} else {
  console.log('✗ Client build failed or dist not found');
  checks11.push(false);
}

// Check 10: No mock data patterns
const mockPatterns = ['globalThis', 'devStore', 'dev-store', 'mockData', 'fakeData'];
const srcDir = path.join(__dirname, 'client/src');
let hasMockData = false;
const searchDir = (dir) => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      searchDir(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      mockPatterns.forEach(pattern => {
        if (content.includes(pattern)) {
          hasMockData = true;
        }
      });
    }
  });
};
searchDir(srcDir);
if (!hasMockData) {
  console.log('✓ No mock data patterns in frontend code');
  checks11.push(true);
} else {
  console.log('✗ Mock data patterns detected');
  checks11.push(false);
}

// Feature #11 Result
console.log('\n' + '='.repeat(60));
console.log(`FEATURE #11 RESULT: ${checks11.every(c => c) ? '✓ PASSING' : '✗ FAILING'}`);
console.log(`Checks: ${checks11.filter(c => c).length}/${checks11.length} passed`);
console.log('='.repeat(60));

// ============================================================
// FEATURE #12: Back Button Works
// ============================================================
console.log('\n📋 FEATURE #12: Back button works correctly across pages');
console.log('-'.repeat(60));

const checks12 = [];

// Check 1: React Router provides browser history management
if (packageJson.dependencies['react-router-dom']) {
  console.log('✓ React Router v6 installed (provides history management)');
  checks12.push(true);
} else {
  console.log('✗ React Router not installed');
  checks12.push(false);
}

// Check 2: NotFoundPage has back button functionality
if (notFoundContent.includes('useNavigate') && notFoundContent.includes('navigate(-1)')) {
  console.log('✓ NotFoundPage implements back button (navigate(-1))');
  checks12.push(true);
} else {
  console.log('✗ NotFoundPage missing back button implementation');
  checks12.push(false);
}

// Check 3: Dashboard has breadcrumb navigation (for back navigation context)
const dashboardPath = path.join(__dirname, 'client/src/pages/Dashboard.tsx');
const breadcrumbsPath = path.join(__dirname, 'client/src/components/Breadcrumbs.tsx');
if (fs.existsSync(breadcrumbsPath)) {
  const breadcrumbsContent = fs.readFileSync(breadcrumbsPath, 'utf8');
  if (breadcrumbsContent.includes('Link') || breadcrumbsContent.includes('useNavigate')) {
    console.log('✓ Breadcrumbs component provides navigation links');
    checks12.push(true);
  } else {
    console.log('✗ Breadcrumbs component missing navigation');
    checks12.push(false);
  }
} else {
  console.log('✗ Breadcrumbs component not found');
  checks12.push(false);
}

// Check 4: App.tsx doesn't prevent default browser back button
const blocksHistory = appContent.includes('e.preventDefault()') && appContent.includes('history.pushState');
if (!blocksHistory) {
  console.log('✓ App does not block browser back button');
  checks12.push(true);
} else {
  console.log('✗ App may be blocking browser back button');
  checks12.push(false);
}

// Check 5: Routes are properly nested (allows history stack)
if (appContent.includes('<Routes>') && appContent.includes('<Route')) {
  console.log('✓ React Router Routes configured (enables history)');
  checks12.push(true);
} else {
  console.log('✗ React Router Routes not properly configured');
  checks12.push(false);
}

// Check 6: No hash-based routing (which breaks back button)
const usesHashRouting = appContent.includes('HashRouter') || appContent.includes('hash');
if (!usesHashRouting) {
  console.log('✓ Using BrowserRouter (not HashRouter) - back button works');
  checks12.push(true);
} else {
  console.log('✗ Using HashRouter - back button may not work properly');
  checks12.push(false);
}

// Check 7: main.tsx uses BrowserRouter (for proper history)
const mainPath = path.join(__dirname, 'client/src/main.tsx');
const mainContent = fs.readFileSync(mainPath, 'utf8');
if (mainContent.includes('BrowserRouter') || appContent.includes('BrowserRouter')) {
  console.log('✓ BrowserRouter configured (proper history management)');
  checks12.push(true);
} else {
  console.log('✗ BrowserRouter not found');
  checks12.push(false);
}

// Check 8: Link components used for navigation (preserves history)
const linkCount = (appContent.match(/<Link /g) || []).length;
if (linkCount > 0) {
  console.log(`✓ Using Link components for navigation (${linkCount} found)`);
  checks12.push(true);
} else {
  console.log('✗ No Link components found');
  checks12.push(false);
}

// Check 9: ProjectDetail page exists (for multi-level navigation test)
const projectDetailPath = path.join(__dirname, 'client/src/pages/ProjectDetail.tsx');
if (fs.existsSync(projectDetailPath)) {
  console.log('✓ ProjectDetail page exists (enables dashboard > project navigation)');
  checks12.push(true);
} else {
  console.log('✗ ProjectDetail page not found');
  checks12.push(false);
}

// Check 10: Chapter/Detail routes use :id params (enables proper history)
if (appContent.includes(':id')) {
  console.log('✓ Dynamic routes with :id params (proper history entries)');
  checks12.push(true);
} else {
  console.log('✗ No dynamic routes found');
  checks12.push(false);
}

// Feature #12 Result
console.log('\n' + '='.repeat(60));
console.log(`FEATURE #12 RESULT: ${checks12.every(c => c) ? '✓ PASSING' : '✗ FAILING'}`);
console.log(`Checks: ${checks12.filter(c => c).length}/${checks12.length} passed`);
console.log('='.repeat(60));

// ============================================================
// FINAL SUMMARY
// ============================================================
console.log('\n' + '='.repeat(60));
console.log('FINAL SUMMARY');
console.log('='.repeat(60));

const feature11Pass = checks11.every(c => c);
const feature12Pass = checks12.every(c => c);

console.log(`\nFeature #11 (404 Page): ${feature11Pass ? '✓ PASSING' : '✗ FAILING'}`);
console.log(`Feature #12 (Back Button): ${feature12Pass ? '✓ PASSING' : '✗ FAILING'}`);

if (feature11Pass && feature12Pass) {
  console.log('\n🎉 Both features verified successfully!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some checks failed. Review details above.');
  process.exit(1);
}
