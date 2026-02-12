const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath);

// Get or create test user
const email = 'test-dashboard-' + Date.now() + '@example.com';
const userId = 'user-dashboard-' + Date.now();

// Check if user exists
const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
const finalUserId = existingUser ? existingUser.id : userId;

if (!existingUser) {
  const now = new Date().toISOString();
  db.prepare('INSERT INTO users (id, email, password_hash, name, role, preferred_language, theme_preference, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(finalUserId, email, 'dummy-hash', 'Dashboard Test', 'free', 'it', 'light', now, now);
}

// Create test projects in different areas
const projects = [
  { title: 'Romanzo Test', area: 'romanziere', genre: 'Fantasy' },
  { title: 'Saggio Test', area: 'saggista', genre: 'Saggio' },
  { title: 'Articolo Test', area: 'redattore', genre: 'Blog' },
];

const now = new Date().toISOString();

projects.forEach((proj, i) => {
  const projectId = `project-test-${Date.now()}-${i}`;
  db.prepare(`
    INSERT INTO projects (id, user_id, title, description, area, genre, tone, target_audience, pov, word_count_target, status, settings_json, word_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    projectId,
    finalUserId,
    proj.title,
    `Test project for ${proj.area}`,
    proj.area,
    proj.genre,
    'Serio',
    'Generale',
    'Terza persona',
    50000,
    'draft',
    '{}',
    0,
    now,
    now
  );
  console.log(`Created: ${proj.title} (${proj.area})`);
});

// Get a valid token
const JWT_SECRET = process.env.JWT_SECRET || 'omniwriter-secret-key-2024';
const token = jwt.sign(
  { id: finalUserId, email: email, role: 'free' },
  JWT_SECRET,
  { expiresIn: '24h' }
);

console.log('\n=== TEST DATA CREATED ===');
console.log('USER_ID:', finalUserId);
console.log('EMAIL:', email);
console.log('TOKEN:', token);
console.log('\nTest with this token to verify area filtering works');

db.close();
