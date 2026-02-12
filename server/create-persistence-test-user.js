const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const uuid = require('uuid');

const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');
const userId = uuid.v4();
const now = new Date().toISOString();
const passwordHash = bcrypt.hashSync('TestPass123!', 10);

const result = db.prepare(`
  INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(userId, 'persistence_test_fresh@test.com', passwordHash, 'Persistence Test Fresh', 'user', now, now);

console.log('✓ User created in database:');
console.log('  ID:', userId);
console.log('  Email: persistence_test_fresh@test.com');
console.log('  Password: TestPass123!');
console.log('  Created at:', now);

db.close();
