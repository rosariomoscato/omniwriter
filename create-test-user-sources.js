const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const db = new sqlite3.Database('./omniwriter.db');
const userId = uuidv4();
const hashedPassword = bcrypt.hashSync('Test1234!', 10);

db.run('INSERT INTO users (id, email, password_hash, name, role, preferred_language, theme_preference) VALUES (?, ?, ?, ?, ?, ?, ?)',
  [userId, 'test@omniwriter.com', hashedPassword, 'Test User', 'free', 'it', 'light'], (err) => {
    if (err) {
      console.error('Error creating user:', err.message);
    } else {
      console.log('User created:', userId);
    }
    db.close();
  });
