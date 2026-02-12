const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = new Database('./data/omniwriter.db');
const JWT_SECRET = process.env.JWT_SECRET || 'omniwriter-secret-key-2024';

// Get or create a test user
const email = 'test-sources-' + Date.now() + '@example.com';
const password = 'Password123';
const hashed = bcrypt.hashSync(password, 10);
const userId = 'user-sources-' + Date.now();

db.prepare('INSERT INTO users (id, email, password_hash, name, role, preferred_language, theme_preference, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))').run(userId, email, hashed, 'Sources Test', 'free', 'it', 'light');

// Create a session token
const token = jwt.sign(
  { id: userId, email: email, role: 'free' },
  JWT_SECRET,
  { expiresIn: '24h' }
);

// Store in sessions
const sessionId = 'session-' + Date.now();
db.prepare('INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, datetime("now", "+1 day"), datetime("now"))').run(sessionId, userId, token);

console.log('USER_ID:', userId);
console.log('EMAIL:', email);
console.log('TOKEN:', token);

db.close();
