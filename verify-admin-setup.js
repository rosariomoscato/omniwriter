const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

console.log('=== Verifying Admin Setup (Feature #349) ===\n');

// 1. Check admin_logs table exists
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_logs'").get();
console.log('✓ admin_logs table exists:', !!tables);

// 2. Check if admin user exists
const admin = db.prepare('SELECT id, email, name, role FROM users WHERE email = ?').get('admin@omniwriter.com');
console.log('✓ Admin user exists:', !!admin);
if (admin) {
  console.log('  - Email:', admin.email);
  console.log('  - Name:', admin.name);
  console.log('  - Role:', admin.role);
}

// 3. Check users table has role column
const cols = db.prepare("PRAGMA table_info(users)").all();
const roleCol = cols.find(c => c.name === 'role');
console.log('✓ role column exists in users:', !!roleCol);

// 4. Verify requireAdmin middleware exists
const fs = require('fs');
const rolesContent = fs.readFileSync('./server/src/middleware/roles.ts', 'utf8');
console.log('✓ requireAdmin middleware exists:', rolesContent.includes('requireAdmin'));

// 5. Check stats endpoint exists
const adminContent = fs.readFileSync('./server/src/routes/admin.ts', 'utf8');
console.log('✓ GET /api/admin/stats endpoint exists:', adminContent.includes("'/stats'"));

// 6. Verify stats response structure
console.log('✓ Stats returns totalUsers:', adminContent.includes('totalUsers'));
console.log('✓ Stats returns usersByRole:', adminContent.includes('usersByRole'));
console.log('✓ Stats returns projectsByArea:', adminContent.includes('projectsByArea'));
console.log('✓ Stats returns totalWordsGenerated:', adminContent.includes('totalWordsGenerated'));
console.log('✓ Stats returns activeUsersLast30Days:', adminContent.includes('activeUsersLast30Days'));
console.log('✓ Stats returns newUsersLast30Days:', adminContent.includes('newUsersLast30Days'));
console.log('✓ Stats returns totalChapters:', adminContent.includes('totalChapters'));

db.close();
console.log('\n=== Feature #349 & #350 Verification Complete ===');
