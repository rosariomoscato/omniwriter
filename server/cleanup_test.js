const Database = require('better-sqlite3');

const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

// Delete test projects and chapters
db.prepare('DELETE FROM chapters WHERE project_id LIKE ?').run('test-proj-%');
db.prepare('DELETE FROM projects WHERE id LIKE ?').run('test-proj-%');

// Delete test marketplace items
db.prepare('DELETE FROM marketplace_reviews WHERE marketplace_item_id IN (SELECT id FROM marketplace_items WHERE project_id LIKE ?)').run('test-proj-%');
db.prepare('DELETE FROM marketplace_downloads WHERE marketplace_item_id IN (SELECT id FROM marketplace_items WHERE project_id LIKE ?)').run('test-proj-%');
db.prepare('DELETE FROM marketplace_items WHERE project_id LIKE ?').run('test-proj-%');

// Delete test users
db.prepare("DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%example%'").run();

console.log('Test data cleaned up');

db.close();
