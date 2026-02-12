const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const db = new Database('./data/omniwriter.db');

const email = 'test@omniwriter.com';
const password = 'Test123!';
const passwordHash = bcrypt.hashSync(password, 10);

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  console.log('ℹ️  Utente test esiste già, aggiorno password...');
  db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(passwordHash, email);
} else {
  console.log('➕ Creo nuovo utente di test...');
  const userId = generateUUID();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, subscription_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, email, passwordHash, 'Test User', 'free', 'active');
}

const user = db.prepare('SELECT email, name, role FROM users WHERE email = ?').get(email);
console.log('');
console.log('✅ Utente di test pronto:');
console.log(`   📧 Email:    ${user.email}`);
console.log(`   🔑 Password: ${password}`);
console.log(`   👤 Nome:     ${user.name}`);
console.log(`   🏷️  Ruolo:    ${user.role}`);

db.close();
