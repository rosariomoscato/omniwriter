const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

const userId = '1bcbad3f-bb99-4a5b-b580-afd4ec2510cd';

// List all models for our user
const models = db.prepare('SELECT id, name, user_id, training_status FROM human_models WHERE user_id = ?').all(userId);
console.log('Models for test user:', models);

if (models.length === 0) {
  console.log('No models found, creating one...');
  const crypto = require('crypto');
  const modelId = crypto.randomUUID();
  db.prepare(
    "INSERT INTO human_models (id, user_id, name, description, model_type, analysis_result_json, total_word_count, training_status, style_strength, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
  ).run(modelId, userId, 'Test Style Profile', 'For dropdown testing', 'saggista_basic', JSON.stringify({
    tone: "Formal and academic",
    sentence_structure: "Complex with subordinate clauses",
    vocabulary: "Rich and varied",
    patterns: ["Metaphor usage", "Long descriptive paragraphs"]
  }), 10000, 'ready', 50);
  console.log('Created model:', modelId);
} else {
  for (const m of models) {
    db.prepare(
      "UPDATE human_models SET training_status = 'ready', analysis_result_json = ? WHERE id = ?"
    ).run(JSON.stringify({
      tone: "Formal and academic",
      sentence_structure: "Complex with subordinate clauses",
      vocabulary: "Rich and varied",
      patterns: ["Metaphor usage", "Long descriptive paragraphs"]
    }), m.id);
    console.log('Updated model', m.id, 'to ready');
  }
}

// Verify projects and chapters
const projects = db.prepare('SELECT id, title, area FROM projects WHERE user_id = ?').all(userId);
console.log('Projects for user:', projects);

if (projects.length > 0) {
  for (const p of projects) {
    const chapters = db.prepare('SELECT id, title, order_index FROM chapters WHERE project_id = ?').all(p.id);
    console.log('Chapters for project ' + p.title + ':', chapters);
  }
}

db.close();
