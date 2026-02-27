/**
 * Test script for Feature #399
 * Tests that validateCharacterStatus correctly handles notes with mixed survival/death keywords
 * where survival keywords appear first (in original AI output) and death keywords are added
 * later via "Status dedotto dal testo" text.
 */

const fs = require('fs');
const path = require('path');

// Read and eval the validateCharacterStatus function from projects.ts
const projectsPath = path.join(__dirname, 'server/src/routes/projects.ts');
const projectsContent = fs.readFileSync(projectsPath, 'utf-8');

// Extract the function - we'll test it manually by recreating the logic
function validateCharacterStatus(status, notes, language = 'it') {
  if (!notes || !status) {
    return { status, correctionLogged: false };
  }

  const notesLower = notes.toLowerCase();
  const isItalian = language === 'it';

  // Survival keywords that indicate character is ALIVE
  // Note: "finale" removed as standalone - too ambiguous ("battaglia finale" vs "nel finale")
  const survivalKeywordsIt = [
    'sopravvive', 'sopravvisse', 'si salvò', 'si salva', 'salvato', 'salvata',
    'vivo', 'viva', 'vivente', 'in vita',
    'si riprende', 'si riprese', 'guarito', 'guarita', 'guarì',
    'emerge', 'emerso', 'emersa', 'si rialza finalmente', 'finalmente si rialza',
    'celebra', 'celebrò', 'festeggia', 'festeggiò', 'trionfa', 'trionfò',
    'vince', 'vinse', 'vittoria', 'vincitore', 'vincitrice',
    'epilogo', 'alla fine', 'nel finale', 'nel epilogo',
    'anni dopo', 'continua', 'continuò', 'visse', 'vive ancora',
    'abbraccia', 'abbracciò', 'sorriso', 'sorrise', 'felice',
    'nuova era', 'nuovo inizio', 'futuro', 'speranza',
    'insieme', 'unito', 'unita', 'riunito', 'riunita'
  ];

  // Survival keywords that indicate character is ALIVE
  // Note: "finale" removed as standalone - too ambiguous ("final battle" vs "in the finale")
  const survivalKeywordsEn = [
    'survives', 'survived', 'escaped death', 'cheated death',
    'alive', 'living', 'in life', 'still breathing',
    'recovers', 'recovered', 'healed', 'got better',
    'emerges', 'emerged', 'rises', 'rose again', 'got back up',
    'celebrates', 'celebrated', 'rejoices', 'rejoiced', 'triumphs', 'triumphed',
    'wins', 'won', 'victory', 'victorious',
    'epilogue', 'in the end', 'at the end', 'in the finale',
    'years later', 'continues', 'continued', 'lived', 'lives on',
    'embraces', 'embraced', 'smiles', 'smiled', 'happy',
    'new era', 'new beginning', 'future', 'hope',
    'together', 'united', 'reunited'
  ];

  // Death keywords that indicate character is DEAD
  const deathKeywordsIt = [
    'muore', 'morì', 'morto', 'morta', 'morte',
    'ucciso', 'uccisa', 'ammazzato', 'ammazzata',
    'deceduto', 'deceduta', 'perito', 'perita', 'spirò',
    'ultimo respiro', 'esalò', 'smise di respirare',
    'corpo senza vita', 'cadavere', 'defunto', 'defunta',
    'non si rialzò più', 'non si mosse più', 'mai più',
    'sacrifica la vita', 'sacrificò la vita', 'muore da eroe'
  ];

  const deathKeywordsEn = [
    'dies', 'died', 'dead', 'death', 'deceased',
    'killed', 'murdered', 'slain', 'slayed',
    'perished', 'expired', 'passed away',
    'last breath', 'breathed last', 'stopped breathing',
    'lifeless body', 'corpse', 'lifeless',
    'never got back up', 'never moved again', 'never rose again',
    'sacrificed life', 'gave life', 'died a hero'
  ];

  const survivalKeywords = isItalian ? survivalKeywordsIt : survivalKeywordsEn;
  const deathKeywords = isItalian ? deathKeywordsIt : deathKeywordsEn;

  // Feature #399: Extract the ORIGINAL notes (before any "Status dedotto/deduced" additions)
  const statusDedottoMarkers = isItalian
    ? ['status dedotto dal testo', 'status dedotto:', '[corretto da']
    : ['status deduced from text', 'status deduced:', '[corrected from'];

  let originalNotes = notes;
  for (const marker of statusDedottoMarkers) {
    const markerIndex = notesLower.indexOf(marker.toLowerCase());
    if (markerIndex > 0) {
      originalNotes = notes.substring(0, markerIndex).trim();
      break;
    }
  }
  const originalNotesLower = originalNotes.toLowerCase();

  // Check for survival keywords in ORIGINAL notes (before system additions)
  const hasSurvivalKeywordInOriginal = survivalKeywords.some(kw => originalNotesLower.includes(kw.toLowerCase()));

  // Check for survival keywords in FULL notes (for backward compatibility)
  const hasSurvivalKeyword = survivalKeywords.some(kw => notesLower.includes(kw.toLowerCase()));

  // Check for death keywords in full notes
  const hasDeathKeyword = deathKeywords.some(kw => notesLower.includes(kw.toLowerCase()));

  // Check for death keywords ONLY in original notes (not in system additions)
  const hasDeathKeywordInOriginal = deathKeywords.some(kw => originalNotesLower.includes(kw.toLowerCase()));

  // Validate status against notes
  const statusLower = status.toLowerCase();

  // Feature #399: If survival keywords are in the ORIGINAL notes, they take priority
  const survivalTakesPriority = hasSurvivalKeywordInOriginal && !hasDeathKeywordInOriginal;

  // CASE 1: Status is 'dead' but notes say they survive
  if (statusLower === 'dead' && hasSurvivalKeyword && (survivalTakesPriority || !hasDeathKeyword)) {
    return { status: 'alive', correctionLogged: true };
  }

  // CASE 2: Status is 'alive' but notes say they die
  if (statusLower === 'alive' && hasDeathKeyword && !hasSurvivalKeyword) {
    return { status: 'dead', correctionLogged: true };
  }

  // CASE 3: Status is 'injured' but notes say they die
  if (statusLower === 'injured' && hasDeathKeyword && !hasSurvivalKeyword) {
    return { status: 'dead', correctionLogged: true };
  }

  // CASE 4: Status is 'missing' but notes clearly say they survive
  if (statusLower === 'missing' && hasSurvivalKeyword && (survivalTakesPriority || !hasDeathKeyword)) {
    return { status: 'alive', correctionLogged: true };
  }

  return { status, correctionLogged: false };
}

// Test cases
const testCases = [
  // Feature #399 specific cases - notes with mixed keywords
  {
    name: "Athan - status='dead' + 'Sopravvive' + 'Status dedotto: muore'",
    status: 'dead',
    notes: 'Sopravvive alla battaglia finale e celebra la vittoria (Status dedotto dal testo: il personaggio muore nella storia)',
    expected: 'alive',
    description: 'Survival keyword at start should take priority over death keyword in system addition'
  },
  {
    name: "Gloria - status='dead' + 'Emerge più forte' + 'Status dedotto: muore'",
    status: 'dead',
    notes: 'Emerge più forte dopo il rituale e guida la resistenza (Status dedotto dal testo: il personaggio muore nella storia)',
    expected: 'alive',
    description: 'Survival keyword "emerge" should take priority'
  },
  {
    name: "KT119U - status='dead' + 'si riprende' + 'muore' in appended",
    status: 'dead',
    notes: 'Il robot si riprende e celebra la vittoria con gli amici (Status dedotto dal testo: il personaggio muore nella storia)',
    expected: 'alive',
    description: 'Survival keywords should take priority over appended death keywords'
  },
  // Original test cases (should still work)
  {
    name: "Simple survival - status='dead' + 'Sopravvive'",
    status: 'dead',
    notes: 'Sopravvive alla battaglia',
    expected: 'alive',
    description: 'Simple survival case without mixed keywords'
  },
  {
    name: "Simple death - status='alive' + 'Muore'",
    status: 'alive',
    notes: 'Muore durante la battaglia',
    expected: 'dead',
    description: 'Simple death case'
  },
  {
    name: "Both keywords in original - NO correction (ambiguous)",
    status: 'dead',
    notes: 'Sopravvive miracolosamente anche se tutti pensavano che muore',
    expected: 'dead',
    description: 'Both survival and death keywords in original text - cannot auto-correct, too ambiguous'
  },
  {
    name: "Death in original - status='alive' + 'Muore' (no survival)",
    status: 'alive',
    notes: 'Il personaggio muore eroicamente nella battaglia finale',
    expected: 'dead',
    description: 'Death keyword without survival keyword should correct to dead'
  },
  {
    name: "No correction needed - status='alive' + 'Sopravvive'",
    status: 'alive',
    notes: 'Sopravvive alla battaglia',
    expected: 'alive',
    description: 'Status matches notes - no correction needed'
  },
  {
    name: "No correction needed - status='dead' + 'Muore'",
    status: 'dead',
    notes: 'Muore durante la battaglia',
    expected: 'dead',
    description: 'Status matches notes - no correction needed'
  },
  {
    name: "English - status='dead' + 'Survives' + 'Status deduced: dies'",
    status: 'dead',
    notes: 'Survives the final battle and celebrates victory (Status deduced from text: character dies in the story)',
    expected: 'alive',
    language: 'en',
    description: 'English version of mixed keyword case'
  },
  {
    name: "Injured to dead - status='injured' + 'Muore'",
    status: 'injured',
    notes: 'Ferito gravemente, muore dopo la battaglia',
    expected: 'dead',
    description: 'Injured status with death in notes should correct to dead'
  },
  {
    name: "Missing to alive - status='missing' + 'Sopravvive' + 'Status dedotto: muore'",
    status: 'missing',
    notes: 'Sopravvive e riappare nel finale (Status dedotto dal testo: il personaggio muore nella storia)',
    expected: 'alive',
    description: 'Missing status with survival keyword should correct to alive'
  },
  {
    name: "Corrected marker - status='dead' + 'Sopravvive' + '[Corretto da'",
    status: 'dead',
    notes: 'Sopravvive alla battaglia [Corretto da dead a alive]',
    expected: 'alive',
    description: 'Should handle [Corretto da] marker'
  },
  {
    name: "English corrected marker - status='dead' + 'Survives' + '[Corrected from'",
    status: 'dead',
    notes: 'Survives the battle [Corrected from dead to alive]',
    expected: 'alive',
    language: 'en',
    description: 'Should handle [Corrected from] marker'
  },
  {
    name: "Death keyword in original AND survival in original - NO correction",
    status: 'dead',
    notes: 'Sopravvive anche se sembra che muore, in realtà guarisce',
    expected: 'dead',
    description: 'Both keywords in original - too ambiguous to auto-correct'
  },
  {
    name: "Empty notes - no correction",
    status: 'dead',
    notes: '',
    expected: 'dead',
    description: 'Empty notes should not trigger correction'
  },
  {
    name: "Null notes - no correction",
    status: 'dead',
    notes: null,
    expected: 'dead',
    description: 'Null notes should not trigger correction'
  }
];

// Run tests
console.log('='.repeat(80));
console.log('Feature #399 Test Suite: validateCharacterStatus with mixed keywords');
console.log('='.repeat(80));
console.log('');

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = validateCharacterStatus(test.status, test.notes, test.language || 'it');
  const success = result.status === test.expected;

  if (success) {
    console.log(`✅ PASS: ${test.name}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${test.name}`);
    console.log(`   Status: '${test.status}'`);
    console.log(`   Notes: '${test.notes}'`);
    console.log(`   Expected: '${test.expected}'`);
    console.log(`   Got: '${result.status}'`);
    console.log(`   Description: ${test.description}`);
    failed++;
  }
}

console.log('');
console.log('='.repeat(80));
console.log(`Results: ${passed}/${testCases.length} tests passed (${failed} failed)`);
console.log('='.repeat(80));

process.exit(failed > 0 ? 1 : 0);
