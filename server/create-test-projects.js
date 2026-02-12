/**
 * Create 100+ test projects for performance testing (features #151 and #152)
 */

const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath);

console.log('Creating test projects for performance testing...\n');

// Get a test user (first user in DB)
const user = db.prepare('SELECT id FROM users LIMIT 1').get();
if (!user) {
  console.error('No users found in database. Please create a user first.');
  process.exit(1);
}

const userId = user.id;
console.log(`Using user ID: ${userId}`);

// Check current count
const currentCount = db.prepare('SELECT COUNT(*) as count FROM projects WHERE user_id = ?').get(userId);
console.log(`Current project count: ${currentCount.count}`);

const targetCount = 100;
const projectsToCreate = Math.max(0, targetCount - currentCount.count);

if (projectsToCreate === 0) {
  console.log(`\n✅ Already have ${currentCount.count} projects. No need to create more.`);
  db.close();
  process.exit(0);
}

console.log(`Creating ${projectsToCreate} test projects...\n`);

const areas = ['romanziere', 'saggista', 'redattore'];
const statuses = ['draft', 'in_progress', 'completed', 'archived'];
const genres = ['Fantascienza', 'Fantasy', 'Thriller', 'Romanzo storico', 'Horror', 'Narrativa', 'Saggio', 'Biografia'];
const tones = ['Formale', 'Colloquiale', 'Drammatico', 'Ironico', 'Poetico'];

const insertProject = db.prepare(`
  INSERT INTO projects (
    id, user_id, title, description, area, genre, tone, target_audience,
    pov, word_count_target, status, settings_json, word_count, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertTag = db.prepare('INSERT INTO project_tags (project_id, tag_name) VALUES (?, ?)');

const tagPool = ['scrittura', 'draft', 'pubblicabile', 'revisione', 'idea', 'serie', 'standalone'];

let created = 0;
let errors = 0;

// Create projects in batches of 10
const batchSize = 10;
for (let i = 0; i < projectsToCreate; i += batchSize) {
  const batchEnd = Math.min(i + batchSize, projectsToCreate);

  for (let j = i; j < batchEnd; j++) {
    try {
      const id = uuidv4();
      const area = areas[j % areas.length];
      const now = new Date().toISOString();
      const createdTime = new Date(Date.now() - (projectsToCreate - j) * 60000).toISOString(); // Stagger over time

      const projectData = {
        id,
        user_id: userId,
        title: `Progetto di test ${j + 1} - ${area}`,
        description: `Descrizione del progetto di test numero ${j + 1}. Questo è un progetto creato automaticamente per test delle prestazioni con molti progetti.`,
        area,
        genre: genres[j % genres.length],
        tone: tones[j % tones.length],
        target_audience: 'Generale',
        pov: 'Terza persona',
        word_count_target: 50000,
        status: statuses[j % statuses.length],
        settings_json: '{}',
        word_count: Math.floor(Math.random() * 10000),
        created_at: createdTime,
        updated_at: now
      };

      const result = insertProject.run(
        projectData.id,
        projectData.user_id,
        projectData.title,
        projectData.description,
        projectData.area,
        projectData.genre,
        projectData.tone,
        projectData.target_audience,
        projectData.pov,
        projectData.word_count_target,
        projectData.status,
        projectData.settings_json,
        projectData.word_count,
        projectData.created_at,
        projectData.updated_at
      );

      // Add 2-4 random tags to each project
      const numTags = 2 + Math.floor(Math.random() * 3);
      for (let t = 0; t < numTags; t++) {
        const tag = tagPool[Math.floor(Math.random() * tagPool.length)];
        try {
          insertTag.run(id, tag);
        } catch (e) {
          // Ignore duplicate tag errors
        }
      }

      created++;
      if (created % 10 === 0) {
        process.stdout.write(`\rCreated: ${created}/${projectsToCreate}`);
      }
    } catch (error) {
      errors++;
      console.error(`\n❌ Error creating project ${j + 1}:`, error.message);
    }
  }
}

console.log(`\rCreated: ${created}/${projectsToCreate}`);

// Verify final count
const finalCount = db.prepare('SELECT COUNT(*) as count FROM projects WHERE user_id = ?').get(userId);
console.log(`\n✅ Final project count for user: ${finalCount.count}`);
console.log(`❌ Errors: ${errors}`);

db.close();

if (created === projectsToCreate) {
  console.log('\n✅ Success! You now have 100+ projects for performance testing.');
  console.log('\nNext steps:');
  console.log('1. Start the server: npm run dev (from server/ directory)');
  console.log('2. Login and test dashboard loading speed');
  console.log('3. Test search performance');
} else {
  console.log('\n⚠️  Some projects failed to create. Check the errors above.');
}
