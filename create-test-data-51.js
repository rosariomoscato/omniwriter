const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const crypto = require('crypto');

const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

const userId = '360c5167-c1b9-4fce-a1cf-c9cbe4854976';

// Create project
const projectId = crypto.randomUUID();
db.prepare(`
  INSERT INTO projects (id, user_id, title, description, area, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`).run(projectId, userId, 'Chapter Reorder Test', 'Test project for feature #51', 'romanziere', 'in_progress');
console.log('Created project:', projectId);

// Create 5 chapters
const chapterTitles = ['Chapter One', 'Chapter Two', 'Chapter Three', 'Chapter Four', 'Chapter Five'];
chapterTitles.forEach((title, index) => {
  const chapterId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO chapters (id, project_id, title, content, order_index, status, word_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(chapterId, projectId, title, `Content of ${title}`, index, 'draft', 100);
});
console.log('Created 5 chapters');

console.log('\nNavigate to: http://localhost:3000/projects/' + projectId);
