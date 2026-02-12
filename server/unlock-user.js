const Database = require('better-sqlite3');

const db = new Database('./data/omniwriter.db');

console.log('🔓 Sblocco utente test@omniwriter.com...\n');

// Verifico se esiste la tabella login_attempts
const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='login_attempts'").get();

if (tableExists) {
  // Cancello i tentativi di login per questo utente
  const result = db.prepare('DELETE FROM login_attempts WHERE email = ?').run('test@omniwriter.com');
  console.log('✅ Eliminati', result.changes, 'tentativi di login falliti');
} else {
  console.log('ℹ️  Tabella login_attempts non trovata');
}

// Verifico anche se ci sono sessioni da pulire
const sessions = db.prepare('DELETE FROM sessions WHERE user_id IS NULL').run();
if (sessions.changes > 0) {
  console.log('✅ Pulite', sessions.changes, 'sessioni invalide');
}

db.close();
console.log('\n🎉 Utente sbloccato! Ora puoi fare il login.');
