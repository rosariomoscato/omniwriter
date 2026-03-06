/**
 * Feature #404: User storage quota tracking helpers
 *
 * Tracks storage_used_bytes on the users table.
 * Storage includes: uploaded source files (PDF, DOCX, TXT, RTF),
 * EPUB cover images, and saved export files.
 * Generated text content (novels, essays, articles) does NOT count.
 *
 * Default limit: 100 MB (104857600 bytes) per user.
 */

import { getDatabase } from '../db/database';

/**
 * Increase user's storage_used_bytes after a file upload.
 * @param userId - The user's ID
 * @param bytes - Number of bytes to add
 */
export function increaseUserStorage(userId: string, bytes: number): void {
  if (bytes <= 0) return;
  const db = getDatabase();
  db.prepare(
    "UPDATE users SET storage_used_bytes = storage_used_bytes + ?, updated_at = datetime('now') WHERE id = ?"
  ).run(bytes, userId);
}

/**
 * Decrease user's storage_used_bytes after a file deletion.
 * Ensures storage_used_bytes never goes below 0.
 * @param userId - The user's ID
 * @param bytes - Number of bytes to subtract
 */
export function decreaseUserStorage(userId: string, bytes: number): void {
  if (bytes <= 0) return;
  const db = getDatabase();
  db.prepare(
    "UPDATE users SET storage_used_bytes = MAX(0, storage_used_bytes - ?), updated_at = datetime('now') WHERE id = ?"
  ).run(bytes, userId);
}

/**
 * Get user's current storage usage and limit.
 * @param userId - The user's ID
 * @returns Object with used and limit in bytes
 */
export function getUserStorageInfo(userId: string): { used: number; limit: number } {
  const db = getDatabase();
  const row = db.prepare(
    'SELECT storage_used_bytes, storage_limit_bytes FROM users WHERE id = ?'
  ).get(userId) as { storage_used_bytes: number; storage_limit_bytes: number } | undefined;

  if (!row) {
    return { used: 0, limit: 104857600 }; // default 100MB
  }

  return {
    used: row.storage_used_bytes,
    limit: row.storage_limit_bytes,
  };
}

/**
 * Recalculate storage_used_bytes from the sources table for a user.
 * Useful for correcting drift or after manual database edits.
 * @param userId - The user's ID
 */
export function recalculateUserStorage(userId: string): number {
  const db = getDatabase();
  const result = db.prepare(
    'SELECT COALESCE(SUM(file_size), 0) as total FROM sources WHERE user_id = ?'
  ).get(userId) as { total: number };

  const totalBytes = result.total;
  db.prepare(
    "UPDATE users SET storage_used_bytes = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(totalBytes, userId);

  return totalBytes;
}

/**
 * Check if a user has enough storage quota for a new file.
 * @param userId - The user's ID
 * @param newFileBytes - Size of the file to be uploaded
 * @returns true if file fits within quota, false otherwise
 */
export function hasStorageQuota(userId: string, newFileBytes: number): boolean {
  const info = getUserStorageInfo(userId);
  return (info.used + newFileBytes) <= info.limit;
}
