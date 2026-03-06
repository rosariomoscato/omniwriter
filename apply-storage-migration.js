/**
 * Apply Feature #404 storage migration to database
 */

const Database = require('better-sqlite3');
const path = require('path');

// Open database
const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath);

console.log('=== Applying Feature #404 Storage Migration ===\n');

try {
  // Check current columns
  const usersInfo = db.pragma('table_info(users)', { simple: false });
  const columns = usersInfo.map(col => col.name);

  console.log('Current users table columns related to storage:');
  console.log('- storage_used_bytes:', columns.includes('storage_used_bytes') ? 'EXISTS' : 'MISSING');
  console.log('- storage_limit_bytes:', columns.includes('storage_limit_bytes') ? 'EXISTS' : 'MISSING');

  if (!columns.includes('storage_used_bytes')) {
    console.log('\nAdding storage_used_bytes column...');
    db.exec('ALTER TABLE users ADD COLUMN storage_used_bytes INTEGER NOT NULL DEFAULT 0');
    console.log('✅ storage_used_bytes column added');
  } else {
    console.log('\n✅ storage_used_bytes column already exists');
  }

  if (!columns.includes('storage_limit_bytes')) {
    console.log('\nAdding storage_limit_bytes column...');
    db.exec('ALTER TABLE users ADD COLUMN storage_limit_bytes INTEGER NOT NULL DEFAULT 104857600');
    console.log('✅ storage_limit_bytes column added (100MB default)');
  } else {
    console.log('\n✅ storage_limit_bytes column already exists');
  }

  // Backfill storage_used_bytes from existing sources
  if (columns.includes('storage_used_bytes')) {
    console.log('\nBackfilling storage_used_bytes from existing sources...');
    const updateStmt = db.prepare(`
      UPDATE users SET storage_used_bytes = (
        SELECT COALESCE(SUM(file_size), 0) FROM sources WHERE sources.user_id = users.id
      )
    `);
    const result = updateStmt.run();
    console.log(`✅ Backfilled ${result.changes} users`);
  }

  // Verify the migration
  console.log('\n=== Verification ===');
  const sampleUser = db.prepare('SELECT id, email, storage_used_bytes, storage_limit_bytes FROM users LIMIT 1').get();
  if (sampleUser) {
    console.log('Sample user:');
    console.log('- Email:', sampleUser.email);
    console.log('- Storage Used:', sampleUser.storage_used_bytes, 'bytes');
    console.log('- Storage Limit:', sampleUser.storage_limit_bytes, 'bytes (100MB = 104857600)');

    const usedMB = (sampleUser.storage_used_bytes / (1024 * 1024)).toFixed(2);
    const limitMB = (sampleUser.storage_limit_bytes / (1024 * 1024)).toFixed(2);
    const percent = ((sampleUser.storage_used_bytes / sampleUser.storage_limit_bytes) * 100).toFixed(2);

    console.log('- Storage Used:', usedMB, 'MB');
    console.log('- Storage Limit:', limitMB, 'MB');
    console.log('- Percentage:', percent + '%');
  }

  console.log('\n✅ Migration completed successfully!');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
