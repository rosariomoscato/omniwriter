# Feature #418: Aggiornamento seed e dati di test - Implementation Summary

## Objective
Update database seed files and test data to use the new 'user' and 'admin' roles instead of old roles (free, premium, lifetime). Add storage fields to seed data.

## Implementation Status: ✅ COMPLETE

## Finding: Already Implemented by Previous Features

The seed data and database schema were already updated as part of previous features:

### 1. Database Schema (server/src/db/database.ts)

#### Users Table - Lines 48-66
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT NOT NULL DEFAULT '',
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),  -- ✅ New role system
  preferred_language TEXT NOT NULL DEFAULT 'it' CHECK(preferred_language IN ('it', 'en')),
  theme_preference TEXT NOT NULL DEFAULT 'light' CHECK(theme_preference IN ('light', 'dark')),
  google_id TEXT UNIQUE,
  google_access_token TEXT,
  google_refresh_token TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT,
  storage_used_bytes INTEGER NOT NULL DEFAULT 0,      -- ✅ Storage fields
  storage_limit_bytes INTEGER NOT NULL DEFAULT 104857600  -- ✅ 100MB default
);
```

**Key Updates:**
- ✅ Role constraint changed from `('free', 'premium', 'lifetime', 'admin')` to `('user', 'admin')`
- ✅ Default role is 'user'
- ✅ Storage fields added with appropriate defaults

### 2. Seed Function (server/src/db/database.ts) - Lines 591-611

```typescript
function seedAdminUser(db: Database.Database): void {
  const adminEmail = 'admin@omniwriter.com';
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);

  if (!existingAdmin) {
    console.log('[Database] Creating default admin user...');
    const adminId = uuidv4();
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('Admin2026!', salt);

    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, preferred_language, theme_preference, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'admin', 'it', 'light', datetime('now'), datetime('now'))`
    ).run(adminId, adminEmail, passwordHash, 'Admin');

    console.log('[Database] Default admin user created: admin@omniwriter.com');
  } else {
    // Ensure existing admin user has admin role
    db.prepare("UPDATE users SET role = 'admin' WHERE email = ? AND role != 'admin'").run(adminEmail);
  }
}
```

**Key Updates:**
- ✅ Creates admin with `role = 'admin'` (not 'premium' or 'lifetime')
- ✅ Updates existing admin users to ensure they have the 'admin' role
- ✅ No references to old role system

### 3. Role Migration (Lines 522-533)

```typescript
// Feature #401: Migrate roles from free/premium/lifetime to user/admin
try {
  const oldRolesExist = db.prepare("SELECT COUNT(*) as count FROM users WHERE role IN ('free', 'premium', 'lifetime')").get() as { count: number };
  if (oldRolesExist.count > 0) {
    console.log(`[Database] Feature #401: Migrating ${oldRolesExist.count} users from old roles (free/premium/lifetime) to 'user'...`);
    db.exec("UPDATE users SET role = 'user' WHERE role IN ('free', 'premium', 'lifetime')");
    console.log('[Database] Feature #401: Role migration completed');
  }
} catch (roleMigrationError) {
  console.log('[Database] Role migration (may already be applied):', roleMigrationError);
}
```

**Key Updates:**
- ✅ Automatically migrates existing users from old roles to 'user'
- ✅ Preserves admin role
- ✅ Safe to run multiple times (idempotent)

### 4. Storage Field Migration (Lines 502-520)

```typescript
// Feature #404: Add storage_used_bytes and storage_limit_bytes columns to users
if (!userColumnNames.includes('storage_used_bytes')) {
  console.log('[Database] Adding storage_used_bytes column to users...');
  db.exec('ALTER TABLE users ADD COLUMN storage_used_bytes INTEGER NOT NULL DEFAULT 0');

  // Backfill storage_used_bytes from existing sources for each user
  console.log('[Database] Backfilling storage_used_bytes from existing sources...');
  db.exec(`
    UPDATE users SET storage_used_bytes = (
      SELECT COALESCE(SUM(file_size), 0) FROM sources WHERE sources.user_id = users.id
    )
  `);
  console.log('[Database] storage_used_bytes backfilled successfully');
}

if (!userColumnNames.includes('storage_limit_bytes')) {
  console.log('[Database] Adding storage_limit_bytes column to users...');
  db.exec('ALTER TABLE users ADD COLUMN storage_limit_bytes INTEGER NOT NULL DEFAULT 104857600');
}
```

**Key Updates:**
- ✅ Adds storage_used_bytes with backfill from existing source files
- ✅ Adds storage_limit_bytes with 100MB (104857600 bytes) default
- ✅ Safe to run multiple times

### 5. Subscription Column Removal (Lines 535-579)

```typescript
// Feature #414: Remove subscription columns from users table
if (userColumnNames.includes('subscription_status')) {
  console.log('[Database] Feature #414: Removing subscription_status and subscription_expires_at columns...');
  // SQLite doesn't support DROP COLUMN directly, need to rebuild table
  db.pragma('foreign_keys = OFF');
  db.exec(`
    CREATE TABLE users_new (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT NOT NULL DEFAULT '',
      bio TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),  -- ✅ New role only
      preferred_language TEXT NOT NULL DEFAULT 'it' CHECK(preferred_language IN ('it', 'en')),
      theme_preference TEXT NOT NULL DEFAULT 'light' CHECK(theme_preference IN ('light', 'dark')),
      google_id TEXT UNIQUE,
      google_access_token TEXT,
      google_refresh_token TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT,
      storage_used_bytes INTEGER NOT NULL DEFAULT 0,      -- ✅ Storage included
      storage_limit_bytes INTEGER NOT NULL DEFAULT 104857600
    );
    INSERT INTO users_new (...)
    SELECT ... FROM users;
    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;
  `);
  db.pragma('foreign_keys = ON');
}
```

**Key Updates:**
- ✅ Removes subscription_status and subscription_expires_at columns
- ✅ Rebuilds table with only 'user' and 'admin' roles
- ✅ Preserves storage fields
- ✅ Recreates indexes

## Verification Results

1. ✅ **Seed files updated**: `seedAdminUser()` uses 'admin' role
2. ✅ **Test users with old roles removed**: No test files insert users with premium/lifetime/free roles
3. ✅ **Storage fields added**: Both in schema and migrations
4. ✅ **Test fixtures verified**: No fixture files found that need updating
5. ✅ **Clean database test**: Schema and seed work correctly on fresh database

## Test Data Verification

Searched for any test scripts or fixture files that create test users:
- ✅ No files found with `INSERT INTO users` using old roles
- ✅ No mock data files with premium/lifetime roles
- ✅ All existing test scripts use dynamic role retrieval from database

## Files Modified (by previous features)

- **server/src/db/database.ts** - Main database initialization and migrations
  - Lines 48-66: Users table schema with new roles
  - Lines 502-520: Storage field migrations
  - Lines 522-533: Role migration
  - Lines 535-579: Subscription column removal
  - Lines 591-611: Seed admin user function

## Related Features

- Depends on: #401 (Premium tier removal - provided role system)
- Depends on: #404 (Storage quota tracking - provided storage fields)
- Related to: #414 (Payment/subscription system removal)

## Status: ✅ PASSING

Feature #418 requirements were already implemented as part of Features #401, #404, and #414.
The database schema, migrations, and seed function all use the new 'user' and 'admin' roles.
Storage fields are properly defined and included in all relevant operations.
No additional changes needed.
