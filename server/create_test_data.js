const Database = require('better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

// Create test project
const projectId = 'test-proj-' + Date.now();
const userId = '8986f7a1-8268-49e1-a3ba-5cbaeb77ebc8';
const now = new Date().toISOString();

db.prepare(`
  INSERT INTO projects (id, user_id, title, description, area, genre, status, word_count, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(projectId, userId, 'Test Novel for Marketplace', 'A great test novel for marketplace', 'romanziere', 'Fantasy', 'completed', 50000, now, now);

// Create test chapter
const chapterId = 'test-chap-' + Date.now();
db.prepare(`
  INSERT INTO chapters (id, project_id, title, content, order_index, status, word_count, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(chapterId, projectId, 'Chapter 1', 'This is the content of chapter 1. It contains some test text for our marketplace novel.', 1, 'final', 150, now, now);

console.log('Created project:', projectId);
console.log('Created chapter:', chapterId);

db.close();
