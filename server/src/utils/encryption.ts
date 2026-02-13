import crypto from 'crypto';

// Encryption configuration
// The encryption key should be stored in environment variables
// For development, we generate a consistent key based on a secret
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // Initialization vector length for GCM
const AUTH_TAG_LENGTH = 16; // Authentication tag length for GCM
const SALT_LENGTH = 64;

/**
 * Get the encryption key from environment or derive one
 * In production, ENCRYPTION_KEY must be set as a 32-byte hex string (64 characters)
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;

  if (envKey) {
    // Use the provided key (should be 32 bytes / 64 hex characters)
    const keyBuffer = Buffer.from(envKey, 'hex');
    if (keyBuffer.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be a 32-byte hex string (64 characters)');
    }
    return keyBuffer;
  }

  // For development: derive a consistent key from a secret
  // WARNING: In production, always use a proper ENCRYPTION_KEY from environment
  const devSecret = process.env.JWT_SECRET || 'omniwriter-dev-secret-key';
  return crypto.createHash('sha256').update(devSecret).digest();
}

/**
 * Encrypt a sensitive value (like an API key)
 * Returns a base64-encoded string containing: salt + iv + authTag + encryptedData
 *
 * @param plaintext - The text to encrypt
 * @returns Base64-encoded encrypted string
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    return '';
  }

  const key = getEncryptionKey();

  // Generate a random salt for each encryption
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Derive a key specific to this encryption using the salt
  const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha512');

  // Generate a random initialization vector
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher with GCM mode (provides authentication)
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, derivedKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  // Encrypt the data
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  // Get the authentication tag
  const authTag = cipher.getAuthTag();

  // Combine salt + iv + authTag + encrypted data
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);

  // Return as base64
  return combined.toString('base64');
}

/**
 * Decrypt a previously encrypted value
 *
 * @param encryptedBase64 - The base64-encoded encrypted string
 * @returns The decrypted plaintext
 */
export function decrypt(encryptedBase64: string): string {
  if (!encryptedBase64) {
    return '';
  }

  try {
    const key = getEncryptionKey();

    // Decode the base64 string
    const combined = Buffer.from(encryptedBase64, 'base64');

    // Extract the components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    // Derive the same key using the salt
    const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha512');

    // Create decipher
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, derivedKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // Set the authentication tag for verification
    decipher.setAuthTag(authTag);

    // Decrypt the data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    // Decryption failed - this could mean the data was tampered with
    // or the encryption key changed
    console.error('[Encryption] Decryption failed:', error);
    throw new Error('Failed to decrypt data - it may have been tampered with');
  }
}

/**
 * Check if a value appears to be encrypted (basic heuristic)
 * Encrypted values from this module are base64 and have a specific length structure
 *
 * @param value - The value to check
 * @returns True if the value appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
  if (!value) {
    return false;
  }

  try {
    const buffer = Buffer.from(value, 'base64');
    // Encrypted values should have at least salt (64) + iv (16) + authTag (16) + some data
    return buffer.length >= SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1;
  } catch {
    return false;
  }
}

/**
 * Hash a value using SHA-256 (one-way, for comparison purposes)
 *
 * @param value - The value to hash
 * @returns Hex-encoded hash string
 */
export function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export default {
  encrypt,
  decrypt,
  isEncrypted,
  hash,
};
