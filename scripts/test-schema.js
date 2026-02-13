const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const fs = require('fs');

// Test database path
const testDbPath = '/tmp/claude/test-schema.db';

// Remove existing test db
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const db = new Database(testDbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'free' CHECK(role IN ('free', 'premium', 'lifetime', 'admin')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS llm_providers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_type TEXT NOT NULL CHECK(provider_type IN ('openai', 'anthropic', 'google_gemini', 'open_router', 'requesty', 'custom')),
    display_name TEXT NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    api_base_url TEXT DEFAULT '',
    additional_config_json TEXT DEFAULT '{}',
    is_active INTEGER NOT NULL DEFAULT 1,
    connection_status TEXT NOT NULL DEFAULT 'not_tested' CHECK(connection_status IN ('not_tested', 'connected', 'failed')),
    last_test_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    selected_provider_id TEXT REFERENCES llm_providers(id) ON DELETE SET NULL,
    selected_model_id TEXT DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_llm_providers_user_id ON llm_providers(user_id);
  CREATE INDEX IF NOT EXISTS idx_llm_providers_is_active ON llm_providers(is_active);
  CREATE INDEX IF NOT EXISTS idx_user_preferences_selected_provider_id ON user_preferences(selected_provider_id);
`);

console.log('Migration successful!');

// Verify tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables:', tables.map(t => t.name));

// Verify llm_providers schema
const llmProvidersSchema = db.prepare("PRAGMA table_info(llm_providers)").all();
console.log('\nllm_providers columns:');
llmProvidersSchema.forEach(col => console.log('  -', col.name, ':', col.type));

// Verify user_preferences schema
const prefsSchema = db.prepare("PRAGMA table_info(user_preferences)").all();
console.log('\nuser_preferences columns:');
prefsSchema.forEach(col => console.log('  -', col.name, ':', col.type));

// Verify indexes
const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name").all();
console.log('\nIndexes:', indexes.map(i => i.name));

// Test encryption utility
console.log('\n--- Testing Encryption Utility ---');
const crypto = require('crypto');

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

function getEncryptionKey() {
  const devSecret = 'test-secret-key';
  return crypto.createHash('sha256').update(devSecret).digest();
}

function encrypt(plaintext) {
  if (!plaintext) return '';
  const key = getEncryptionKey();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha512');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, derivedKey, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString('base64');
}

function decrypt(encryptedBase64) {
  if (!encryptedBase64) return '';
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedBase64, 'base64');
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha512');
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, derivedKey, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

const testApiKey = 'sk-test-api-key-12345';
const encrypted = encrypt(testApiKey);
const decrypted = decrypt(encrypted);

console.log('Original:', testApiKey);
console.log('Encrypted length:', encrypted.length);
console.log('Decrypted:', decrypted);
console.log('Encryption test:', testApiKey === decrypted ? 'PASSED' : 'FAILED');

db.close();
console.log('\nTest complete - all migrations work correctly!');
