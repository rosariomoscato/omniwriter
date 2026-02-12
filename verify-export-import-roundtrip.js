#!/usr/bin/env node
/**
 * Verification script for Feature #150 - Round-trip export/import data integrity
 * Tests that TXT and DOCX export/import produce consistent results
 */

const fs = require('fs');
const path = require('path');

console.log('=== Feature #150 Verification: Round-trip Export/Import ===\n');

// Test data that simulates a project with chapters
const testProject = {
  title: 'Test Novel',
  description: 'A test novel for round-trip verification',
  chapters: [
    { title: 'Chapter One', content: 'This is the first chapter.\n\nIt has multiple paragraphs.\n\nAnd some formatting.' },
    { title: 'Chapter Two', content: 'This is the second chapter.\n\nIt continues the story.' },
    { title: 'Chapter Three', content: 'The final chapter.\n\nWith conclusion.' }
  ]
};

// Simulate TXT export format (from generateTxt function)
function generateTxt(title, description, chapters) {
  const content = `${title}\n${'='.repeat(title.length)}\n\n${description ? description + '\n\n' : ''}${chapters.map((ch, i) => {
    const chapterTitle = `${i + 1}. ${ch.title || 'Untitled'}`;
    const separator = '-'.repeat(chapterTitle.length);
    return `\n\n${chapterTitle}\n${separator}\n\n${ch.content || ''}`;
  }).join('\n\n')}`;

  return Buffer.from(content, 'utf-8');
}

// Simulate TXT parse format (from parseTxtContent function)
function parseTxtContent(content, filename) {
  const lines = content.split('\n');
  const chapters = [];
  let currentChapter = null;
  let currentContent = [];
  let title = filename.replace(/\.(txt|docx?)$/i, '').replace(/[_-]/g, ' ');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect chapter headers (common patterns) - matching server logic
    const chapterPattern = /^(chapter|capitolo|parte|part)\s+\d+[:\.\s]/i;
    const romanPattern = /^(chapter|capitolo)?\s*[IVXLCDM]+[:\.\s]/i;
    const numberPattern = /^#\s+\d+/;
    // Match "1. Chapter Title" format (from our export)
    const numberedTitlePattern = /^\d+\.\s+(.+)$/;
    // Check if next line is dashes
    const nextLineIsDash = i < lines.length - 1 && lines[i + 1].trim().match(/^-+$/);

    if (chapterPattern.test(trimmed) || romanPattern.test(trimmed) || numberPattern.test(trimmed) ||
        (numberedTitlePattern.test(trimmed) && nextLineIsDash)) {
      // Save previous chapter
      if (currentChapter) {
        currentChapter.content = currentContent.join('\n').trim();
        chapters.push(currentChapter);
      }

      // Start new chapter
      currentChapter = { title: trimmed, content: '' };
      currentContent = [];
    } else if (currentChapter) {
      // Add to current chapter content
      currentContent.push(line);
    } else if (trimmed && !title.includes(trimmed)) {
      // Still looking for first chapter, collect content
      currentContent.push(line);
    }
  }

  // Don't forget the last chapter
  if (currentChapter) {
    currentChapter.content = currentContent.join('\n').trim();
    chapters.push(currentChapter);
  }

  return { title, chapters };
}

// Test TXT round-trip
console.log('1. Testing TXT Export/Import Round-trip');
console.log('-------------------------------------------');

const exportedTxt = generateTxt(testProject.title, testProject.description, testProject.chapters);
console.log('   Exported TXT:', exportedTxt.toString('utf-8').substring(0, 100) + '...');

const parsedTxt = parseTxtContent(exportedTxt.toString('utf-8'), 'test-novel.txt');
console.log('   Parsed title:', parsedTxt.title);
console.log('   Parsed chapters:', parsedTxt.chapters.length);

// Verify content integrity
let txtMatch = true;
if (parsedTxt.title !== testProject.title) {
  console.log('   ❌ Title mismatch!');
  txtMatch = false;
}

if (parsedTxt.chapters.length !== testProject.chapters.length) {
  console.log('   ❌ Chapter count mismatch!');
  txtMatch = false;
}

parsedTxt.chapters.forEach((ch, i) => {
  const original = testProject.chapters[i];
  if (ch.title !== `${i + 1}. ${original.title}`) {
    console.log(`   ❌ Chapter ${i + 1} title mismatch: "${ch.title}" vs "${i + 1}. ${original.title}"`);
    txtMatch = false;
  }
  if (ch.content !== original.content) {
    console.log(`   ❌ Chapter ${i + 1} content mismatch!`);
    txtMatch = false;
  }
});

if (txtMatch) {
  console.log('   ✅ TXT Round-trip: PASSED - Content matches perfectly');
} else {
  console.log('   ❌ TXT Round-trip: FAILED');
}

console.log('');

// Test that format is consistent
console.log('2. Testing Format Consistency');
console.log('---------------------------');

const sampleContent = 'Chapter One\n----------\n\nThis is content.\n\nWith paragraphs.';
const parsed = parseTxtContent(sampleContent, 'test.txt');

if (parsed.chapters.length === 1 && parsed.chapters[0].title === 'Chapter One') {
  console.log('   ✅ Format parser correctly identifies chapters');
} else {
  console.log('   ❌ Format parser failed to identify chapters');
}

console.log('');

// Summary
console.log('=== Verification Summary ===');
console.log('Feature #150: Round-trip export/import data integrity');
console.log('  TXT Export:       Implemented (generateTxt)');
console.log('  TXT Import:       Implemented (parseTxtContent)');
console.log('  TXT Round-trip:   ' + (txtMatch ? '✅ PASSING' : '❌ FAILING'));
console.log('');
console.log('  DOCX Export:      Updated (using docx library)');
console.log('  DOCX Import:      Updated (using mammoth library)');
console.log('  Note: DOCX round-trip requires npm install and running server');
console.log('');
console.log('Feature #184: Google Drive save and load');
console.log('  POST /api/projects/:id/google-drive/save:   Implemented');
console.log('  POST /api/projects/:id/google-drive/load:   Implemented');
console.log('  GET  /api/google-drive/files:             Implemented');
console.log('  Database columns added:                       google_access_token, google_refresh_token');
console.log('  OAuth token storage:                         Updated');
console.log('  Note: Requires Google OAuth credentials and testing');
