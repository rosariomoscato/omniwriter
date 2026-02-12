// Quick check of users in database
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'server/data/omniwriter.db');

if (!fs.existsSync(dbPath)) {
  console.log('❌ Database not found at:', dbPath);
  process.exit(1);
}

try {
  // Use sqlite3 CLI instead
  const { execSync } = require('child_process');
  const result = execSync(`sqlite3 "${dbPath}" "SELECT id, email, name, role, theme_preference FROM users LIMIT 5;"`, { encoding: 'utf8' });
  console.log('Users in database:');
  console.log(result);
} catch (error) {
  console.error('Error reading database:', error.message);
}
