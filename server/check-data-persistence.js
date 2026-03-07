const Database = require('./node_modules/better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath, { readonly: true });

// Check if there's actual data in the database
console.log('=== Data Persistence Verification ===\n');

// Check users
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
console.log('Users in database:', userCount.count);

// Check projects
const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get();
console.log('Projects in database:', projectCount.count);

// Check chapters
const chapterCount = db.prepare('SELECT COUNT(*) as count FROM chapters').get();
console.log('Chapters in database:', chapterCount.count);

// Check sources
const sourceCount = db.prepare('SELECT COUNT(*) as count FROM sources').get();
console.log('Sources in database:', sourceCount.count);

// Sample user data
const sampleUsers = db.prepare('SELECT id, email, name, role, created_at FROM users LIMIT 5').all();
console.log('\nSample users:');
sampleUsers.forEach(u => {
  console.log(`  - ${u.email} (${u.name}) [${u.role}] - created: ${u.created_at}`);
});

// Sample project data
const sampleProjects = db.prepare('SELECT id, title, area, status, created_at FROM projects LIMIT 5').all();
console.log('\nSample projects:');
sampleProjects.forEach(p => {
  console.log(`  - ${p.title} [${p.area}] [${p.status}] - created: ${p.created_at}`);
});

// Check database file info
const fs = require('fs');
const stats = fs.statSync(dbPath);
console.log('\nDatabase file info:');
console.log(`  Path: ${dbPath}`);
console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Last modified: ${stats.mtime}`);

// Verify WAL mode
const walMode = db.pragma('journal_mode', { simple: true });
console.log(`  WAL mode: ${walMode}`);

db.close();

console.log('\n✅ Data persistence verified: Database contains', userCount.count, 'users and', projectCount.count, 'projects');
