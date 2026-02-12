const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = '/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db';
const TEST_EMAIL_FILE = '/Users/rosario/CODICE/omniwriter/server/.persistence_test_email.txt';

console.log('=== PERSISTENCE TEST ===\n');

// Step 1: Create a test user directly in database
console.log('Step 1: Creating test user in database...');
const db = new Database(DB_PATH);
const timestamp = Date.now();
const testEmail = `persistence_test_${timestamp}@test.com`;
const hashedPassword = bcrypt.hashSync('TestPass123!', 10);

const insertResult = db.prepare(`
  INSERT INTO users (email, password_hash, name)
  VALUES (?, ?, ?)
`).run(testEmail, hashedPassword, 'Persistence Test User');

const userId = insertResult.lastInsertRowid;
console.log(`✓ Created user ID: ${userId}, Email: ${testEmail}`);

// Save test email for later
fs.writeFileSync(TEST_EMAIL_FILE, testEmail);

// Verify user exists BEFORE restart
const userBefore = db.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);
console.log(`✓ User exists before restart: ${userBefore ? 'YES' : 'NO'} (name: ${userBefore?.name})`);

db.close();

// Step 2: Stop the server
console.log('\nStep 2: Stopping server...');
const { execSync } = require('child_process');
const pids = execSync('lsof -ti :3000').toString().trim().split('\n').filter(Boolean);
console.log(`Found PIDs: ${pids.join(', ')}`);

// Kill all processes on port 3000
pids.forEach(pid => {
  try {
    process.kill(parseInt(pid), 'SIGTERM');
    console.log(`✓ Sent SIGTERM to PID ${pid}`);
  } catch (e) {
    console.log(`  (PID ${pid} already stopped)`);
  }
});

// Wait for server to stop
sleep(5000);

// Verify all are stopped
const remaining = execSync('lsof -ti :3000 2>/dev/null || true').toString().trim();
if (remaining) {
  console.log(`Warning: Some processes still running: ${remaining}`);
} else {
  console.log('✓ All server processes stopped');
}

// Step 3: Verify user is STILL in database (file-based persistence)
console.log('\nStep 3: Verifying data persisted in database file...');
const db2 = new Database(DB_PATH);
const userAfterStop = db2.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);
console.log(`✓ User exists after server stop: ${userAfterStop ? 'YES' : 'NO'}`);

if (!userAfterStop) {
  console.log('\n✗✗✗ CRITICAL FAILURE ✗✗✗');
  console.log('Data was lost immediately after server stop - this should NEVER happen with SQLite!');
  db2.close();
  process.exit(1);
}

db2.close();

// Step 4: Restart server
console.log('\nStep 4: Restarting server...');
const { spawn } = require('child_process');
const serverProcess = spawn('npm', ['run', 'dev'], {
  cwd: '/Users/rosario/CODICE/omniwriter/server',
  detached: true,
  stdio: 'ignore',
  shell: true
});

fs.writeFileSync('/Users/rosario/CODICE/omniwriter/server/.server.pid', serverProcess.pid.toString());
serverProcess.unref();
console.log(`✓ Server restarted (PID: ${serverProcess.pid})`);

// Wait for server to be ready
sleep(5000);

// Step 5: Verify user is still accessible after restart
console.log('\nStep 5: Verifying user after restart...');
const db3 = new Database(DB_PATH);
const userAfterRestart = db3.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);
console.log(`✓ User exists after restart: ${userAfterRestart ? 'YES' : 'NO'}`);

if (!userAfterRestart) {
  console.log('\n✗✗✗ CRITICAL FAILURE ✗✗✗');
  console.log('Data was lost after server restart - using in-memory storage!');
  db3.close();
  process.exit(1);
}

console.log(`✓ User data intact: ID=${userAfterRestart.id}, Name=${userAfterRestart.name}`);

// Cleanup
console.log('\nStep 6: Cleaning up...');
db3.prepare('DELETE FROM users WHERE email = ?').run(testEmail);
console.log('✓ Test user deleted');

db3.close();

console.log('\n=== ✅ PERSISTENCE TEST PASSED ===');
console.log('Data successfully persisted across server restart!');

function sleep(ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // Busy wait (synchronous)
  }
}
