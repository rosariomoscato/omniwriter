const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

const userId = '8986f7a1-8268-49e1-a3ba-5cbaeb77ebc8';
const projectId = 'test-proj-1772875665258';
const id = uuidv4();
const now = new Date().toISOString();

db.prepare(
  `INSERT INTO marketplace_items (id, project_id, user_id, title, author_name, description, category, genre, word_count, download_count, average_rating, review_count, is_approved, is_visible, published_at, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0.0, 0, 1, 1, ?, ?)`
).run(id, projectId, userId, 'Another Test Novel', 'Marketplace Tester', 'Another test', 'romanziere', 'Fantasy', 150, now, now);

console.log('Created marketplace item:', id);

db.close();
