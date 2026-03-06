/**
 * Verification script for Features #404 and #406
 *
 * Feature #404: Storage quota data model
 * Feature #406: Storage status API endpoint
 */

const Database = require('better-sqlite3');
const path = require('path');

// Open database
const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath);

console.log('=== Verifying Feature #404: Storage Quota Data Model ===\n');

// Check if columns exist
const usersInfo = db.pragma('table_info(users)', { simple: false });
const columns = usersInfo.map(col => col.name);

console.log('Users table columns:');
console.log('- storage_used_bytes:', columns.includes('storage_used_bytes') ? '✅ EXISTS' : '❌ MISSING');
console.log('- storage_limit_bytes:', columns.includes('storage_limit_bytes') ? '✅ EXISTS' : '❌ MISSING');

if (columns.includes('storage_used_bytes') && columns.includes('storage_limit_bytes')) {
  // Check default values
  const createSQL = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
  console.log('\nTable schema includes storage columns: ✅');

  // Check a sample user
  const sampleUser = db.prepare('SELECT id, email, storage_used_bytes, storage_limit_bytes FROM users LIMIT 1').get();
  if (sampleUser) {
    console.log('\nSample user storage data:');
    console.log('- User:', sampleUser.email);
    console.log('- Used:', sampleUser.storage_used_bytes, 'bytes');
    console.log('- Limit:', sampleUser.storage_limit_bytes, 'bytes');
    console.log('- Default limit (100MB): 104857600 bytes:', sampleUser.storage_limit_bytes === 104857600 ? '✅' : '⚠️');
  }

  // Calculate total sources for comparison
  const totalSources = db.prepare('SELECT SUM(file_size) as total FROM sources').get();
  console.log('\nTotal storage used in sources table:', totalSources.total, 'bytes');
}

console.log('\n=== Verifying Feature #406: Storage API Endpoint ===\n');

// Check if the endpoint is defined in users.ts
const fs = require('fs');
const usersRoutePath = path.join(__dirname, 'server', 'src', 'routes', 'users.ts');

if (fs.existsSync(usersRoutePath)) {
  const usersRouteContent = fs.readFileSync(usersRoutePath, 'utf8');

  console.log('Checking users.ts for storage endpoint:');
  console.log("- GET /storage endpoint:", usersRouteContent.includes("router.get('/storage'") ? '✅ EXISTS' : '❌ MISSING');
  console.log("- getUserStorageInfo import:", usersRouteContent.includes('getUserStorageInfo') ? '✅ EXISTS' : '❌ MISSING');
  console.log("- Returns used_bytes:", usersRouteContent.includes('used_bytes') ? '✅ EXISTS' : '❌ MISSING');
  console.log("- Returns limit_bytes:", usersRouteContent.includes('limit_bytes') ? '✅ EXISTS' : '❌ MISSING');
  console.log("- Returns percent_used:", usersRouteContent.includes('percent_used') ? '✅ EXISTS' : '❌ MISSING');
  console.log("- Returns available_bytes:", usersRouteContent.includes('available_bytes') ? '✅ EXISTS' : '❌ MISSING');
}

// Check storage utils
const storageUtilsPath = path.join(__dirname, 'server', 'src', 'utils', 'storage.ts');
if (fs.existsSync(storageUtilsPath)) {
  const storageContent = fs.readFileSync(storageUtilsPath, 'utf8');

  console.log('\nChecking storage.ts utility functions:');
  console.log("- increaseUserStorage:", storageContent.includes('increaseUserStorage') ? '✅ EXISTS' : '❌ MISSING');
  console.log("- decreaseUserStorage:", storageContent.includes('decreaseUserStorage') ? '✅ EXISTS' : '❌ MISSING');
  console.log("- getUserStorageInfo:", storageContent.includes('getUserStorageInfo') ? '✅ EXISTS' : '❌ MISSING');
  console.log("- recalculateUserStorage:", storageContent.includes('recalculateUserStorage') ? '✅ EXISTS' : '❌ MISSING');
  console.log("- hasStorageQuota:", storageContent.includes('hasStorageQuota') ? '✅ EXISTS' : '❌ MISSING');
}

// Check if storage tracking is called in sources.ts
const sourcesRoutePath = path.join(__dirname, 'server', 'src', 'routes', 'sources.ts');
if (fs.existsSync(sourcesRoutePath)) {
  const sourcesContent = fs.readFileSync(sourcesRoutePath, 'utf8');

  console.log('\nChecking sources.ts for storage tracking integration:');
  console.log("- Import storage functions:", sourcesContent.includes('increaseUserStorage') ? '✅ EXISTS' : '❌ MISSING');
  const increaseCount = (sourcesContent.match(/increaseUserStorage/g) || []).length;
  const decreaseCount = (sourcesContent.match(/decreaseUserStorage/g) || []).length;
  console.log("- Calls increaseUserStorage:", increaseCount, 'times');
  console.log("- Calls decreaseUserStorage:", decreaseCount, 'times');
}

db.close();

console.log('\n=== Verification Complete ===');
