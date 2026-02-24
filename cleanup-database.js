/**
 * Database Cleanup Script
 * Feature #360: Pulire database - rimuovere utenti e attività tranne admin
 *
 * Questo script rimuove tutti gli utenti tranne admin@omniwriter.com
 * e pulisce tutte le tabelle correlate.
 */

const Database = require('./server/node_modules/better-sqlite3');
const fs = require('fs');
const path = require('path');

// Database path - check both possible locations
const serverDbPath = path.resolve(__dirname, 'server/data/omniwriter.db');
const rootDbPath = path.resolve(__dirname, 'data/omniwriter.db');

// Use server database if it exists, otherwise use root database
const dbPath = fs.existsSync(serverDbPath) ? serverDbPath : rootDbPath;

console.log('[Cleanup] Connecting to database at:', dbPath);

const db = new Database(dbPath);

// Enable WAL mode
db.pragma('journal_mode = WAL');

// Helper function to safely count rows
function safeCount(tableName) {
  try {
    return db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get().count;
  } catch (e) {
    return 'N/A (table not found)';
  }
}

// Helper function to safely delete rows
function safeDelete(tableName, whereClause = '', params = []) {
  try {
    const sql = whereClause ? `DELETE FROM ${tableName} WHERE ${whereClause}` : `DELETE FROM ${tableName}`;
    const result = db.prepare(sql).run(...params);
    return result.changes;
  } catch (e) {
    if (e.message.includes('no such table')) {
      return 'N/A (table not found)';
    }
    throw e;
  }
}

console.log('\n=== STATO PRIMA DELLA PULIZIA ===\n');

// List all tables first
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Available tables:', tables.map(t => t.name).join(', '));

// Show current state before cleanup
console.log('\n--- Row Counts ---');
console.log('users:', safeCount('users'));
console.log('projects:', safeCount('projects'));
console.log('chapters:', safeCount('chapters'));
console.log('human_models:', safeCount('human_models'));
console.log('sources:', safeCount('sources'));
console.log('sagas:', safeCount('sagas'));
console.log('generation_logs:', safeCount('generation_logs'));
console.log('export_history:', safeCount('export_history'));
console.log('admin_logs:', safeCount('admin_logs'));
// Additional tables to check
console.log('sessions:', safeCount('sessions'));
console.log('password_reset_tokens:', safeCount('password_reset_tokens'));
console.log('user_preferences:', safeCount('user_preferences'));
console.log('characters:', safeCount('characters'));
console.log('locations:', safeCount('locations'));
console.log('plot_events:', safeCount('plot_events'));
console.log('chapter_comments:', safeCount('chapter_comments'));
console.log('chapter_versions:', safeCount('chapter_versions'));
console.log('citations:', safeCount('citations'));
console.log('project_tags:', safeCount('project_tags'));
console.log('saga_continuity:', safeCount('saga_continuity'));
console.log('human_model_sources:', safeCount('human_model_sources'));

// List all users
console.log('\n--- Users ---');
const users = db.prepare('SELECT id, email, role FROM users').all();
users.forEach(u => console.log(`  - ${u.email} (${u.role}) - ID: ${u.id || 'NULL'}`));

// Get admin user ID - try default admin first, then any admin role user
let adminUser = db.prepare("SELECT id, email FROM users WHERE email = 'admin@omniwriter.com'").get();

if (!adminUser) {
  console.log('\n[INFO] admin@omniwriter.com not found, looking for any admin user...');
  adminUser = db.prepare("SELECT id, email FROM users WHERE role = 'admin' LIMIT 1").get();
}

if (!adminUser) {
  console.log('\n[INFO] No admin user found, will keep the first user and promote to admin...');
  adminUser = db.prepare("SELECT id, email FROM users LIMIT 1").get();
  if (adminUser) {
    db.prepare("UPDATE users SET role = 'admin', email = 'admin@omniwriter.com' WHERE id = ?").run(adminUser.id);
    adminUser.email = 'admin@omniwriter.com';
    console.log(`[INFO] Promoted user ${adminUser.id} to admin@omniwriter.com with admin role`);
  }
}

if (!adminUser) {
  console.error('\n[ERROR] No users found at all! Cannot proceed with cleanup.');
  process.exit(1);
}

console.log('\n[Cleanup] Admin user:', adminUser.email || 'admin@omniwriter.com', 'ID:', adminUser.id);

console.log('\n=== ESEGUO PULIZIA ===\n');

try {
  // Start transaction
  db.exec('BEGIN TRANSACTION');

  // 1. Delete all generation logs
  console.log('[1/15] Deleting generation_logs...');
  const genLogsResult = safeDelete('generation_logs');
  console.log(`      Deleted ${genLogsResult} rows`);

  // 2. Delete all export history
  console.log('[2/15] Deleting export_history...');
  const exportResult = safeDelete('export_history');
  console.log(`      Deleted ${exportResult} rows`);

  // 3. Delete all admin logs
  console.log('[3/15] Deleting admin_logs...');
  const adminLogsResult = safeDelete('admin_logs');
  console.log(`      Deleted ${adminLogsResult} rows`);

  // 4. Delete chapters from non-admin projects
  console.log('[4/15] Deleting chapters from non-admin projects...');
  const chaptersResult = safeDelete('chapters', 'project_id IN (SELECT id FROM projects WHERE user_id != ?)', [adminUser.id]);
  console.log(`      Deleted ${chaptersResult} rows`);

  // 5. Delete non-admin projects
  console.log('[5/15] Deleting non-admin projects...');
  const projectsResult = safeDelete('projects', 'user_id != ?', [adminUser.id]);
  console.log(`      Deleted ${projectsResult} rows`);

  // 6. Delete non-admin human models
  console.log('[6/15] Deleting non-admin human models...');
  const humanModelsResult = safeDelete('human_models', 'user_id != ?', [adminUser.id]);
  console.log(`      Deleted ${humanModelsResult} rows`);

  // 7. Delete non-admin sources
  console.log('[7/15] Deleting non-admin sources...');
  const sourcesResult = safeDelete('sources', 'user_id != ?', [adminUser.id]);
  console.log(`      Deleted ${sourcesResult} rows`);

  // 8. Delete non-admin sagas
  console.log('[8/15] Deleting non-admin sagas...');
  const sagasResult = safeDelete('sagas', 'user_id != ?', [adminUser.id]);
  console.log(`      Deleted ${sagasResult} rows`);

  // 9. Delete all sessions
  console.log('[9/15] Deleting all sessions...');
  const sessionsResult = safeDelete('sessions');
  console.log(`      Deleted ${sessionsResult} rows`);

  // 10. Delete all password reset tokens
  console.log('[10/15] Deleting all password reset tokens...');
  const resetTokensResult = safeDelete('password_reset_tokens');
  console.log(`      Deleted ${resetTokensResult} rows`);

  // 11. Delete user preferences for non-admin users
  console.log('[11/15] Deleting user preferences for non-admin users...');
  const userPrefsResult = safeDelete('user_preferences', 'user_id != ?', [adminUser.id]);
  console.log(`      Deleted ${userPrefsResult} rows`);

  // 12. Delete saga continuity records
  console.log('[12/15] Deleting saga continuity records...');
  const sagaContResult = safeDelete('saga_continuity');
  console.log(`      Deleted ${sagaContResult} rows`);

  // 13. Delete human model sources
  console.log('[13/15] Deleting human model sources...');
  const hmSourcesResult = safeDelete('human_model_sources');
  console.log(`      Deleted ${hmSourcesResult} rows`);

  // 14. Delete non-admin users (use email comparison since some IDs may be NULL)
  console.log('[14/15] Deleting non-admin users...');
  // Use email comparison to be safe - handles NULL IDs
  const usersResult = safeDelete('users', "email != 'admin@omniwriter.com'");
  console.log(`      Deleted ${usersResult} rows`);

  // 15. Update the remaining admin user to have the correct email and role
  console.log('[15/15] Ensuring admin user has correct email and role...');
  db.prepare("UPDATE users SET email = 'admin@omniwriter.com', role = 'admin' WHERE id = ?").run(adminUser.id);
  console.log('      Updated admin user to admin@omniwriter.com');

  // Commit transaction
  db.exec('COMMIT');

  console.log('\n=== STATO DOPO LA PULIZIA ===\n');

  // Show state after cleanup
  console.log('--- Row Counts ---');
  console.log('users:', safeCount('users'));
  console.log('projects:', safeCount('projects'));
  console.log('chapters:', safeCount('chapters'));
  console.log('human_models:', safeCount('human_models'));
  console.log('sources:', safeCount('sources'));
  console.log('sagas:', safeCount('sagas'));
  console.log('generation_logs:', safeCount('generation_logs'));
  console.log('export_history:', safeCount('export_history'));
  console.log('admin_logs:', safeCount('admin_logs'));
  // Additional tables
  console.log('sessions:', safeCount('sessions'));
  console.log('password_reset_tokens:', safeCount('password_reset_tokens'));
  console.log('user_preferences:', safeCount('user_preferences'));
  console.log('characters:', safeCount('characters'));
  console.log('locations:', safeCount('locations'));
  console.log('plot_events:', safeCount('plot_events'));
  console.log('chapter_comments:', safeCount('chapter_comments'));
  console.log('chapter_versions:', safeCount('chapter_versions'));
  console.log('citations:', safeCount('citations'));
  console.log('project_tags:', safeCount('project_tags'));
  console.log('saga_continuity:', safeCount('saga_continuity'));
  console.log('human_model_sources:', safeCount('human_model_sources'));

  // Verify only admin exists
  console.log('\n--- Remaining Users ---');
  const remainingUsers = db.prepare('SELECT id, email, role FROM users').all();
  remainingUsers.forEach(u => console.log(`  - ${u.email} (${u.role})`));

  console.log('\n[SUCCESS] Database cleanup completed successfully!');

  // Final verification
  if (remainingUsers.length === 1 && remainingUsers[0].email === 'admin@omniwriter.com') {
    console.log('\n[VERIFIED] Only admin@omniwriter.com exists - CORRECT!');
  } else {
    console.log('\n[WARNING] Unexpected user state!');
  }

} catch (error) {
  db.exec('ROLLBACK');
  console.error('\n[ERROR] Cleanup failed, rolled back:', error);
  process.exit(1);
}

db.close();
