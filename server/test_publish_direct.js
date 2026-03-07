const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

try {
  const userId = '8986f7a1-8268-49e1-a3ba-5cbaeb77ebc8';
  const projectId = 'test-proj-1772875665258';
  const description = 'An amazing fantasy novel for everyone!';

  // Verify the project exists and belongs to the user
  const project = db.prepare(
    'SELECT p.*, u.name as author_name FROM projects p LEFT JOIN users u ON p.user_id = u.id WHERE p.id = ? AND p.user_id = ?'
  ).get(projectId, userId);

  console.log('Project found:', !!project);
  if (project) {
    console.log('Project area:', project.area);
    console.log('Project title:', project.title);
  }

  // Only romanziere and saggista projects can be published
  if (project && !['romanziere', 'saggista'].includes(project.area)) {
    console.log('ERROR: Invalid area');
  }

  // Check if this project is already published
  const existing = db.prepare(
    'SELECT id FROM marketplace_items WHERE project_id = ?'
  ).get(projectId);

  console.log('Already published:', !!existing);

  // Get chapter count and total word count
  const chapterStats = db.prepare(
    'SELECT COUNT(*) as chapter_count, COALESCE(SUM(word_count), 0) as total_words FROM chapters WHERE project_id = ?'
  ).get(projectId);

  console.log('Chapter stats:', chapterStats);

  const id = uuidv4();
  const now = new Date().toISOString();

  console.log('Creating marketplace item with id:', id);

  const insertResult = db.prepare(
    `INSERT INTO marketplace_items (id, project_id, user_id, title, author_name, description, category, genre, word_count, download_count, average_rating, review_count, is_approved, is_visible, published_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0.0, 0, 1, 1, ?, ?)`
  ).run(
    id,
    projectId,
    userId,
    project.title,
    project.author_name || project.name || 'Unknown',
    description || project.description || '',
    project.area,
    project.genre || '',
    chapterStats.total_words || project.word_count || 0,
    now,
    now
  );

  console.log('Insert result:', insertResult);

  const listing = db.prepare('SELECT * FROM marketplace_items WHERE id = ?').get(id);
  console.log('Created listing:', !!listing);

} catch (error) {
  console.error('Error:', error);
}

db.close();
