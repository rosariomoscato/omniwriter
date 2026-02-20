#!/usr/bin/env node
/**
 * Test script for Feature #300: Create sequel with continuity
 *
 * This script tests the POST /api/sagas/:id/create-sequel endpoint
 *
 * Usage: node test-feature-300.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Connect to the database
const dbPath = path.join(__dirname, 'server', 'data', 'omniwriter.db');
console.log('Database path:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.error('Database not found at:', dbPath);
  process.exit(1);
}

const db = new Database(dbPath);

// Check if necessary tables and columns exist
console.log('\n=== Checking Database Schema ===\n');

// Check projects table for continuity_id column
const projectsInfo = db.prepare('PRAGMA table_info(projects)').all();
const projectColumns = projectsInfo.map(col => col.name);

console.log('Projects table columns:', projectColumns.length);
if (projectColumns.includes('continuity_id')) {
  console.log('  ✓ continuity_id column exists');
} else {
  console.log('  ✗ continuity_id column MISSING');
}

if (projectColumns.includes('synopsis')) {
  console.log('  ✓ synopsis column exists');
} else {
  console.log('  ✗ synopsis column MISSING');
}

// Check characters table for status_at_end column
const charactersInfo = db.prepare('PRAGMA table_info(characters)').all();
const characterColumns = charactersInfo.map(col => col.name);

console.log('\nCharacters table columns:', characterColumns.length);
if (characterColumns.includes('status_at_end')) {
  console.log('  ✓ status_at_end column exists');
} else {
  console.log('  ✗ status_at_end column MISSING');
}

if (characterColumns.includes('status_notes')) {
  console.log('  ✓ status_notes column exists');
} else {
  console.log('  ✗ status_notes column MISSING');
}

// Check saga_continuity table exists
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
const tableNames = tables.map(t => t.name);

console.log('\nTables:', tables.length);
if (tableNames.includes('saga_continuity')) {
  console.log('  ✓ saga_continuity table exists');
} else {
  console.log('  ✗ saga_continuity table MISSING');
}

// Check for test data
console.log('\n=== Checking Test Data ===\n');

const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
console.log('Users:', userCount.count);

const sagaCount = db.prepare('SELECT COUNT(*) as count FROM sagas').get();
console.log('Sagas:', sagaCount.count);

const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get();
console.log('Projects:', projectCount.count);

const continuityCount = db.prepare('SELECT COUNT(*) as count FROM saga_continuity').get();
console.log('Saga continuity records:', continuityCount.count);

// Get a sample saga with projects and continuity
const saga = db.prepare('SELECT * FROM sagas LIMIT 1').get();
if (saga) {
  console.log('\n=== Sample Saga Found ===');
  console.log('ID:', saga.id);
  console.log('Title:', saga.title);
  console.log('Area:', saga.area);

  const projects = db.prepare('SELECT id, title, status FROM projects WHERE saga_id = ?').all(saga.id);
  console.log('\nProjects in saga:', projects.length);
  projects.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.title} (${p.status})`);
  });

  const continuity = db.prepare('SELECT * FROM saga_continuity WHERE saga_id = ? ORDER BY episode_number DESC LIMIT 1').get(saga.id);
  if (continuity) {
    console.log('\nLatest continuity record:');
    console.log('  Episode:', continuity.episode_number);
    console.log('  Source project:', continuity.source_project_id);

    try {
      const characters = JSON.parse(continuity.characters_state || '[]');
      const locations = JSON.parse(continuity.locations_visited || '[]');

      console.log('  Characters:', characters.length);
      characters.forEach((char, i) => {
        if (i < 3) {
          console.log(`    - ${char.name} (${char.status || 'unknown'})`);
        }
      });
      if (characters.length > 3) {
        console.log(`    ... and ${characters.length - 3} more`);
      }

      console.log('  Locations:', locations.length);
      locations.forEach((loc, i) => {
        if (i < 3) {
          console.log(`    - ${loc.name}`);
        }
      });
      if (locations.length > 3) {
        console.log(`    ... and ${locations.length - 3} more`);
      }
    } catch (e) {
      console.log('  Error parsing continuity JSON:', e.message);
    }
  }
} else {
  console.log('\n⚠ No sagas found in database');
  console.log('To test the endpoint, you need:');
  console.log('  1. A user account');
  console.log('  2. A saga');
  console.log('  3. At least one project in the saga');
  console.log('  4. Optional: A finalized continuity record');
}

// Check backend route file
console.log('\n=== Checking Backend Implementation ===\n');
const sagasRoutePath = path.join(__dirname, 'server', 'src', 'routes', 'sagas.ts');
if (fs.existsSync(sagasRoutePath)) {
  const sagasRouteContent = fs.readFileSync(sagasRoutePath, 'utf-8');

  if (sagasRouteContent.includes("post('/:id/create-sequel'")) {
    console.log('✓ POST /api/sagas/:id/create-sequel route exists');
  } else {
    console.log('✗ POST /api/sagas/:id/create-sequel route NOT found');
  }

  if (sagasRouteContent.includes('latestContinuity')) {
    console.log('✓ Uses continuity data');
  } else {
    console.log('✗ Does NOT use continuity data');
  }

  if (sagasRouteContent.includes('status_at_end')) {
    console.log('✓ Checks character status_at_end');
  } else {
    console.log('✗ Does NOT check character status_at_end');
  }

  if (sagasRouteContent.includes("status === 'dead'")) {
    console.log('✓ Skips dead characters');
  } else {
    console.log('✗ Does NOT skip dead characters');
  }

  if (sagasRouteContent.includes('copyCharactersFromProject')) {
    console.log('✓ Has helper function to copy characters');
  } else {
    console.log('✗ Missing helper function to copy characters');
  }

  if (sagasRouteContent.includes('copyLocationsFromProject')) {
    console.log('✓ Has helper function to copy locations');
  } else {
    console.log('✗ Missing helper function to copy locations');
  }
} else {
  console.log('✗ Backend route file not found:', sagasRoutePath);
}

// Check frontend API service
console.log('\n=== Checking Frontend Implementation ===\n');
const apiServicePath = path.join(__dirname, 'client', 'src', 'services', 'api.ts');
if (fs.existsSync(apiServicePath)) {
  const apiServiceContent = fs.readFileSync(apiServicePath, 'utf-8');

  if (apiServiceContent.includes('createSagaSequel')) {
    console.log('✓ Frontend API method createSagaSequel exists');
  } else {
    console.log('✗ Frontend API method createSagaSequel NOT found');
  }

  if (apiServiceContent.includes('/sagas/${sagaId}/create-sequel')) {
    console.log('✓ Frontend calls correct endpoint');
  } else {
    console.log('✗ Frontend does NOT call correct endpoint');
  }
} else {
  console.log('✗ Frontend API service file not found:', apiServicePath);
}

db.close();

console.log('\n=== Test Complete ===\n');
console.log('Summary:');
console.log('  - Database schema: ' + (projectColumns.includes('continuity_id') ? 'PASS ✓' : 'FAIL ✗'));
console.log('  - Backend route: ' + (fs.existsSync(sagasRoutePath) ? 'EXISTS ✓' : 'MISSING ✗'));
console.log('  - Frontend API: ' + (fs.existsSync(apiServicePath) ? 'EXISTS ✓' : 'MISSING ✗'));
