#!/usr/bin/env node
/**
 * Verification script for Features #131 and #133
 * Feature #131: Source content extraction and preview
 * Feature #133: Style analysis results display
 */

const Database = require('./server/node_modules/better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath);

console.log('=== Feature #131: Source Content Extraction Check ===\n');

// Check sources table structure and content
const sources = db.prepare(`
  SELECT id, file_name, file_type, content_text,
         LENGTH(content_text) as content_length
  FROM sources
  LIMIT 5
`).all();

console.log(`Found ${sources.length} sources in database:`);
sources.forEach(source => {
  console.log(`  - ${source.file_name}`);
  console.log(`    Type: ${source.file_type}`);
  console.log(`    Content length: ${source.content_length || 0} chars`);
  console.log(`    Has extracted text: ${source.content_text && source.content_text.length > 0 ? 'YES' : 'NO'}`);
  console.log('');
});

// Check if TXT files have content
const txtSources = db.prepare(`
  SELECT id, file_name, content_text
  FROM sources
  WHERE file_type LIKE '%text%' OR file_name LIKE '%.txt'
`).all();

console.log(`TXT Files (${txtSources.length} total):`);
txtSources.forEach(source => {
  const hasContent = source.content_text && source.content_text.length > 0;
  console.log(`  ${source.file_name}: ${hasContent ? '✓ Content extracted' : '✗ No content'}`);
});

console.log('\n=== Feature #133: Human Model Analysis Results Check ===\n');

// Check human models with analysis
const models = db.prepare(`
  SELECT id, name, model_type, training_status,
         json_extract(analysis_result_json, '$.tone') as tone,
         json_extract(analysis_result_json, '$.vocabulary') as vocabulary
  FROM human_models
  ORDER BY created_at DESC
  LIMIT 5
`).all();

console.log(`Found ${models.length} human models:`);
models.forEach(model => {
  console.log(`  - ${model.name}`);
  console.log(`    Type: ${model.model_type}`);
  console.log(`    Status: ${model.training_status}`);
  console.log(`    Has tone data: ${model.tone ? 'YES' : 'NO'}`);
  console.log(`    Has vocabulary data: ${model.vocabulary ? 'YES' : 'NO'}`);
  console.log('');
});

// Check models with ready status
const readyModels = db.prepare(`
  SELECT COUNT(*) as count
  FROM human_models
  WHERE training_status = 'ready'
`).get();

console.log(`Models with 'ready' status: ${readyModels.count}`);
console.log(`Models with analysis completed: ${readyModels.count}`);

db.close();

console.log('\n=== Summary ===');
console.log('Feature #131 (Source extraction):');
console.log('  - Backend: TXT extraction implemented (server/src/routes/sources.ts:63-64)');
console.log('  - Frontend: Preview modal NOT implemented');
console.log('  - Status: PARTIAL - needs UI implementation');
console.log('');
console.log('Feature #133 (Analysis results display):');
console.log('  - Backend: Analysis endpoint exists (server/src/routes/human-models.ts:338-370)');
console.log('  - Frontend: Analysis display NOT implemented');
console.log('  - Status: PARTIAL - needs UI implementation');
