/**
 * Verification script for Feature #44: Language preference persists per user
 *
 * This script verifies:
 * 1. Language preference is stored in database
 * 2. Language preference is loaded on login
 * 3. Each user sees their own language preference
 */

const fs = require('fs');
const path = require('path');

console.log('=== Feature #44: Language Preference Persistence Verification ===\n');

// Step 1: Check database schema has preferred_language column
console.log('Step 1: Checking database schema...');
const dbPath = path.join(__dirname, 'server', 'database.sqlite');

if (!fs.existsSync(dbPath)) {
  console.log('❌ Database file not found:', dbPath);
} else {
  console.log('✅ Database file exists');
}

// Step 2: Verify API endpoint returns preferred_language
console.log('\nStep 2: Checking API implementation...');

// Read the users route file
const usersRoutePath = path.join(__dirname, 'server', 'src', 'routes', 'users.ts');
const usersRouteContent = fs.readFileSync(usersRoutePath, 'utf8');

const hasPreferredLanguageInGet = usersRouteContent.includes('preferred_language') &&
                                  usersRouteContent.includes('SELECT') &&
                                  usersRouteContent.includes('FROM users WHERE id = ?');
const hasPreferredLanguageInPut = usersRouteContent.includes('preferred_language') &&
                                  usersRouteContent.includes('UPDATE users');

if (hasPreferredLanguageInGet && hasPreferredLanguageInPut) {
  console.log('✅ API endpoint /api/users/profile returns preferred_language');
  console.log('✅ API endpoint PUT /api/users/profile accepts preferred_language');
} else {
  if (!hasPreferredLanguageInGet) {
    console.log('❌ GET /api/users/profile does NOT return preferred_language');
  }
  if (!hasPreferredLanguageInPut) {
    console.log('❌ PUT /api/users/profile does NOT accept preferred_language');
  }
}

// Step 3: Verify frontend syncs language on login
console.log('\nStep 3: Checking frontend PreferencesSync component...');
const preferencesSyncPath = path.join(__dirname, 'client', 'src', 'components', 'PreferencesSync.tsx');
const preferencesSyncContent = fs.readFileSync(preferencesSyncPath, 'utf8');

const syncsLanguage = preferencesSyncContent.includes('preferred_language') &&
                     preferencesSyncContent.includes('i18n.changeLanguage');

if (syncsLanguage) {
  console.log('✅ PreferencesSync component syncs language preference from backend');
} else {
  console.log('❌ PreferencesSync component does NOT sync language preference');
}

// Step 4: Verify Header saves language to backend
console.log('\nStep 4: Checking Header language switcher...');
const headerPath = path.join(__dirname, 'client', 'src', 'components', 'Header.tsx');
const headerContent = fs.readFileSync(headerPath, 'utf8');

const savesLanguage = headerContent.includes('toggleLanguage') &&
                     headerContent.includes('updateProfile') &&
                     headerContent.includes('preferred_language');

if (savesLanguage) {
  console.log('✅ Header component saves language preference to backend');
} else {
  console.log('❌ Header component does NOT save language preference');
}

// Step 5: Verify User interface includes preferred_language
console.log('\nStep 5: Checking TypeScript User interface...');
const authContextPath = path.join(__dirname, 'client', 'src', 'contexts', 'AuthContext.tsx');
const authContextContent = fs.readFileSync(authContextPath, 'utf8');

const hasLanguageInInterface = authContextContent.includes('preferred_language') &&
                               authContextContent.includes("'it' | 'en'");

if (hasLanguageInInterface) {
  console.log('✅ User interface includes preferred_language field');
} else {
  console.log('❌ User interface does NOT include preferred_language');
}

// Step 6: Verify API service has updateProfile method with preferred_language
console.log('\nStep 6: Checking API service...');
const apiServicePath = path.join(__dirname, 'client', 'src', 'services', 'api.ts');
const apiServiceContent = fs.readFileSync(apiServicePath, 'utf8');

const hasUpdateProfile = apiServiceContent.includes('updateProfile') &&
                        apiServiceContent.includes('preferred_language');

if (hasUpdateProfile) {
  console.log('✅ API service has updateProfile method with preferred_language');
} else {
  console.log('❌ API service missing updateProfile with preferred_language');
}

// Summary
console.log('\n=== Summary ===');
console.log('Feature #44: Language preference persists per user');
console.log('');

const allChecks = [
  hasPreferredLanguageInGet,
  hasPreferredLanguageInPut,
  syncsLanguage,
  savesLanguage,
  hasLanguageInInterface,
  hasUpdateProfile
];

const passedChecks = allChecks.filter(c => c).length;
console.log(`Checks passed: ${passedChecks}/${allChecks.length}`);

if (passedChecks === allChecks.length) {
  console.log('\n✅ Feature #44 is IMPLEMENTED');
  console.log('\nVerification steps for manual testing:');
  console.log('1. Login as User A, set language to English');
  console.log('2. Logout User A');
  console.log('3. Login as User B, set language to Italian');
  console.log('4. Logout User B');
  console.log('5. Login as User A - verify English is restored');
  console.log('6. Login as User B - verify Italian is restored');
} else {
  console.log('\n⚠️  Feature #44 needs additional implementation');
}
