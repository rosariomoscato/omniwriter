const Database = require('./server/node_modules/better-sqlite3');
const bcrypt = require('./server/node_modules/bcryptjs');
const { v4: uuidv4 } = require('./server/node_modules/uuid');

const db = new Database('./data/omniwriter.db');

// Check if user exists
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('test170@example.com');
if (existing) {
  console.log('User test170@example.com already exists with ID:', existing.id);
  process.exit(0);
}

const hashedPassword = bcrypt.hashSync('Test123456', 10);
const userId = uuidv4();

const insert = db.prepare(`
  INSERT INTO users (id, email, password_hash, name, role, preferred_language, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);
insert.run(userId, 'test170@example.com', hashedPassword, 'Test User 170', 'free', 'it');

console.log('Created user with ID:', userId);
db.close();
