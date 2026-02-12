const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

const userId = '360c5167-c1b9-4fce-a1cf-c9cbe4854976';
const projectId = 'f918f571-9858-4bbf-a9a3-7c5b9569189d';

console.log('User:', userId);
console.log('Project:', projectId);

const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
console.log('Project exists for user:', !!project);
if (project) {
  console.log('Project details:', JSON.stringify(project, null, 2));
}

const chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ?').all(projectId);
console.log('\nChapters for project:', chapters.length);
chapters.forEach(ch => {
  console.log(`  - ${ch.title} (order: ${ch.order_index})`);
});
