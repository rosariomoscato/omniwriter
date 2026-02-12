const Database = require('./server/node_modules/better-sqlite3');
const { v4: uuidv4 } = require('./server/node_modules/uuid');

const db = new Database('./data/omniwriter.db');

// Get user ID
const user = db.prepare('SELECT id FROM users WHERE email = ?').get('test170@example.com');
if (!user) {
  console.log('User not found');
  process.exit(1);
}

// Create a project
const projectId = uuidv4();
const chapterId = uuidv4();

const projectInsert = db.prepare(`
  INSERT INTO projects (id, user_id, title, description, area, status, word_count, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);
projectInsert.run(projectId, user.id, 'Test Project 170', 'Project for testing unsaved changes', 'redattore', 'draft', 0);

// Create a chapter
const chapterInsert = db.prepare(`
  INSERT INTO chapters (id, project_id, title, content, order_index, status, word_count, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);
chapterInsert.run(chapterId, projectId, 'Chapter 1', 'This is test content for feature 170.', 0, 'draft', 7);

console.log('Created project:', projectId);
console.log('Created chapter:', chapterId);
console.log('Chapter URL:', `http://localhost:5173/projects/${projectId}/chapters/${chapterId}`);
db.close();
