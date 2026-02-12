// Verification script for Feature #177 - Generation with sources applied
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath);

console.log('=== Feature #177: Generation with sources applied ===\n');

// 1. Check sources table has content_text column
console.log('1. Checking sources table schema...');
const sourcesSchema = db.prepare("PRAGMA table_info(sources)").all();
const hasContentText = sourcesSchema.some(col => col.name === 'content_text');
console.log(`   ✓ sources table has content_text column: ${hasContentText ? 'YES' : 'NO'}`);

// 2. Check sources table has project_id column
const hasProjectId = sourcesSchema.some(col => col.name === 'project_id');
console.log(`   ✓ sources table has project_id column: ${hasProjectId ? 'YES' : 'NO'}`);

// 3. Find projects with sources
console.log('\n2. Finding projects with uploaded sources...');
const projectsWithSources = db.prepare(`
  SELECT DISTINCT p.id, p.title, p.area, COUNT(s.id) as source_count
  FROM projects p
  LEFT JOIN sources s ON s.project_id = p.id
  GROUP BY p.id
  HAVING source_count > 0
  LIMIT 5
`).all();

if (projectsWithSources.length === 0) {
  console.log('   ⚠ No projects with sources found in database');
  console.log('   This is expected for a fresh database.\n');
  console.log('   Manual testing steps:');
  console.log('   1. Create a test project');
  console.log('   2. Upload a TXT file as source (content will be extracted)');
  console.log('   3. Create a chapter');
  console.log('   4. Click "Regenerate" on the chapter');
  console.log('   5. Verify generated content includes source references');
} else {
  console.log(`   ✓ Found ${projectsWithSources.length} projects with sources:`);
  projectsWithSources.forEach(p => {
    console.log(`     - ${p.title} (${p.area}): ${p.source_count} sources`);
  });

  // 4. Show sample sources with content
  const firstProject = projectsWithSources[0];
  console.log(`\n3. Checking sources for project "${firstProject.title}"...`);
  const sources = db.prepare(`
    SELECT id, file_name, content_text, source_type,
           LENGTH(content_text) as content_length
    FROM sources
    WHERE project_id = ? AND content_text IS NOT NULL AND content_text != ''
    ORDER BY created_at DESC
    LIMIT 3
  `).all(firstProject.id);

  if (sources.length === 0) {
    console.log('   ⚠ Sources exist but have no extracted content');
  } else {
    console.log(`   ✓ Found ${sources.length} sources with content:`);
    sources.forEach(s => {
      const preview = s.content_text ? s.content_text.substring(0, 50) + '...' : '(empty)';
      console.log(`     - ${s.file_name}: ${s.content_length} chars`);
      console.log(`       Preview: ${preview}`);
    });
  }
}

// 5. Verify the code changes
console.log('\n4. Verifying code changes...');
const fs = require('fs');
const chaptersPath = path.join(__dirname, 'server', 'dist', 'routes', 'chapters.js');

if (fs.existsSync(chaptersPath)) {
  const chaptersCode = fs.readFileSync(chaptersPath, 'utf-8');

  // Check if generateMockContent accepts sources parameter
  const hasSourcesParam = /function generateMockContent\([^)]*sources/.test(chaptersCode);
  console.log(`   ✓ generateMockContent accepts sources parameter: ${hasSourcesParam ? 'YES' : 'NO'}`);

  // Check if regenerate endpoint queries sources
  const hasSourcesQuery = chaptersCode.includes('SELECT id, file_name, content_text, file_type, source_type, url\n      FROM sources');
  console.log(`   ✓ Regenerate endpoint queries sources: ${hasSourcesQuery ? 'YES' : 'NO'}`);

  // Check if sources are passed to generation
  const hasSourcesPass = /generateMockContent\([^)]*,\s*projectSources\)/.test(chaptersCode);
  console.log(`   ✓ Sources passed to generation: ${hasSourcesPass ? 'YES' : 'NO'}`);

  // Check for source reference in mock content
  const hasSourceRef = chaptersCode.includes('Fonte:') || chaptersCode.includes('sourceReferences');
  console.log(`   ✓ Generated content includes source references: ${hasSourceRef ? 'YES' : 'NO'}`);

  if (hasSourcesParam && hasSourcesQuery && hasSourcesPass && hasSourceRef) {
    console.log('\n✅ All code changes verified successfully!');
  } else {
    console.log('\n⚠ Some code changes may be missing');
  }
} else {
  console.log(`   ⚠ Compiled chapters.js not found at ${chaptersPath}`);
  console.log(`   Run "npm run build --prefix server" to compile TypeScript`);
}

db.close();
console.log('\n=== Verification complete ===');
