var Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
var db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

console.log("=== Checking existing users and roles ===");
var users = db.prepare('SELECT id, email, role FROM users').all();
console.log("Total users:", users.length);
console.log("Users:");
users.forEach(function(u) {
  console.log("  -", u.email, "role:", u.role);
});

console.log("\n=== Checking users table schema ===");
var userSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
console.log(userSchema.sql);

console.log("\n=== Testing role migration ===");
try {
  // Try to update the CHECK constraint
  // SQLite doesn't support ALTER COLUMN directly, so we need to recreate the table
  var result = db.exec(`
    BEGIN;

    -- Create new users table with updated role constraint
    CREATE TABLE IF NOT EXISTS users_new (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT NOT NULL DEFAULT '',
      bio TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      subscription_status TEXT DEFAULT 'active',
      subscription_expires_at TEXT,
      preferred_language TEXT NOT NULL DEFAULT 'it' CHECK(preferred_language IN ('it', 'en')),
      theme_preference TEXT NOT NULL DEFAULT 'light' CHECK(theme_preference IN ('light', 'dark')),
      google_id TEXT UNIQUE,
      google_access_token TEXT,
      google_refresh_token TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT
    );

    -- Copy data, converting old roles to 'user'
    INSERT INTO users_new (id, email, password_hash, name, bio, avatar_url, role, subscription_status, subscription_expires_at, preferred_language, theme_preference, google_id, google_access_token, google_refresh_token, created_at, updated_at, last_login_at)
    SELECT
      id, email, password_hash, name, bio, avatar_url,
      CASE
        WHEN role = 'admin' THEN 'admin'
        ELSE 'user'
      END as role,
      subscription_status, subscription_expires_at, preferred_language, theme_preference,
      google_id, google_access_token, google_refresh_token, created_at, updated_at, last_login_at
    FROM users;

    -- Drop old table and rename new one
    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;

    COMMIT;
  `);
  console.log("Migration executed successfully!");
} catch(e) {
  console.log("Migration error:", e.message);
  db.exec("ROLLBACK;");
}

console.log("\n=== Checking users after migration ===");
var usersAfter = db.prepare('SELECT id, email, role FROM users').all();
console.log("Total users:", usersAfter.length);
console.log("Users:");
usersAfter.forEach(function(u) {
  console.log("  -", u.email, "role:", u.role);
});

console.log("\n=== Verifying new schema ===");
var newSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
console.log(newSchema.sql);

db.close();
