// Test if auth route can be loaded
process.env.NODE_ENV = 'test';
process.env.GOOGLE_CLIENT_ID = 'test';
process.env.GOOGLE_CLIENT_SECRET = 'test';

try {
  // First test database
  const db = require('./server/node_modules/better-sqlite3')('./server/data/omniwriter.db');
  console.log('Database connected');
  const user = db.prepare('SELECT * FROM users LIMIT 1').get();
  console.log('Sample user:', user ? user.email : 'none');
  db.close();

  // Now try to load the auth module
  const auth = require('./server/src/routes/auth.ts');
  console.log('Auth route loaded:', typeof auth);
} catch(e) {
  console.error('Error:', e.message);
  console.error('Stack:', e.stack);
}
