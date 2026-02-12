#!/usr/bin/env node

const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'data/omniwriter.db');
const db = new Database(dbPath);

const email = 'formdefaults127@test.com';

// Check if user exists
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  console.log('User exists:', existing.id);
  process.exit(0);
}

// Create user
const userId = uuidv4();
const hashedPassword = bcrypt.hashSync('Password123!', 10);

db.prepare(`INSERT INTO users (id, email, password_hash, name, role, preferred_language, theme_preference, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`).run(
  userId,
  email,
  hashedPassword,
  'Form Defaults Test User',
  'free_user',
  'it',
  'light'
);

console.log('Created user:', userId);
db.close();
