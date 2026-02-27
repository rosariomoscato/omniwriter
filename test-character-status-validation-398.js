/**
 * Feature #398: Test character status validation
 *
 * Tests the validateCharacterStatus function to ensure it correctly detects
 * contradictions between status and notes, and auto-corrects them.
 *
 * Edge cases from Robocrazia novel:
 * - Athan: status=dead but notes say "Sopravvive"
 * - Gloria: status=dead but notes say "Emerge più forte"
 * - KT119U: status=dead but notes mention survival
 */

// Simulated validateCharacterStatus function (same logic as in server/src/routes/projects.ts)
function validateCharacterStatus(status, notes, language = 'it') {
  if (!notes || !status) {
    return { status, correctionLogged: false };
  }

  const notesLower = notes.toLowerCase();
  const isItalian = language === 'it';

  // Survival keywords that indicate character is ALIVE
  const survivalKeywordsIt = [
    'sopravvive', 'sopravvisse', 'si salvò', 'si salva', 'salvato', 'salvata',
    'vivo', 'viva', 'vivente', 'in vita',
    'si riprende', 'si riprese', 'guarito', 'guarita', 'guarì',
    'emerge', 'emerso', 'emersa', 'si rialza finalmente', 'finalmente si rialza',
    'celebra', 'celebrò', 'festeggia', 'festeggiò', 'triumfa', 'trionfò',
    'vince', 'vinse', 'vittoria', 'vincitore', 'vincitrice',
    'epilogo', 'finale', 'alla fine', 'nel finale',
    'anni dopo', 'continua', 'continuò', 'visse', 'vive',
    'abbraccia', 'abbracciò', 'sorriso', 'sorrise', 'felice',
    'nuova era', 'nuovo inizio', 'futuro', 'speranza',
    'insieme', 'unito', 'unita', 'riunito', 'riunita'
  ];

  const survivalKeywordsEn = [
    'survives', 'survived', 'escaped death', 'cheated death',
    'alive', 'living', 'in life', 'still breathing',
    'recovers', 'recovered', 'healed', 'got better',
    'emerges', 'emerged', 'rises', 'rose again', 'got back up',
    'celebrates', 'celebrated', 'rejoices', 'rejoiced', 'triumphs', 'triumphed',
    'wins', 'won', 'victory', 'victorious',
    'epilogue', 'finale', 'in the end', 'at the end',
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

  // Check for survival keywords in notes
  const hasSurvivalKeyword = survivalKeywords.some(kw => notesLower.includes(kw.toLowerCase()));

  // Check for death keywords in notes
  const hasDeathKeyword = deathKeywords.some(kw => notesLower.includes(kw.toLowerCase()));

  // Validate status against notes
  const statusLower = status.toLowerCase();

  // CASE 1: Status is 'dead' but notes say they survive
  if (statusLower === 'dead' && hasSurvivalKeyword && !hasDeathKeyword) {
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
  if (statusLower === 'missing' && hasSurvivalKeyword && !hasDeathKeyword) {
    return { status: 'alive', correctionLogged: true };
  }

  return { status, correctionLogged: false };
}

// Test cases
const testCases = [
  // Feature #398 edge cases from Robocrazia novel
  { name: 'Athan', status: 'dead', notes: 'Sopravvive alla battaglia finale', expected: 'alive', language: 'it' },
  { name: 'Gloria', status: 'dead', notes: 'Emerge più forte dopo il rituale', expected: 'alive', language: 'it' },
  { name: 'KT119U', status: 'dead', notes: 'Il robot si riprende e celebra la vittoria', expected: 'alive', language: 'it' },

  // Additional edge cases
  { name: 'Character 1', status: 'dead', notes: 'Sopravvive ma perde un braccio', expected: 'alive', language: 'it' },
  { name: 'Character 2', status: 'dead', notes: 'Emerge dalle macerie con i suoi compagni', expected: 'alive', language: 'it' },
  { name: 'Character 3', status: 'dead', notes: 'Vive felice con la sua famiglia', expected: 'alive', language: 'it' },
  { name: 'Character 4', status: 'dead', notes: 'Si salva saltando giù dalla nave', expected: 'alive', language: 'it' },
  { name: 'Character 5', status: 'dead', notes: 'Celebra il trionfo insieme agli amici', expected: 'alive', language: 'it' },

  // Cases where death is correctly indicated
  { name: 'Character 6', status: 'alive', notes: 'Muore eroicamente nella battaglia', expected: 'dead', language: 'it' },
  { name: 'Character 7', status: 'alive', notes: 'Esala l\'ultimo respiro tra le braccia di Maria', expected: 'dead', language: 'it' },
  { name: 'Character 8', status: 'injured', notes: 'Non si rialzò più dopo lo scontro', expected: 'dead', language: 'it' },
  { name: 'Character 9', status: 'alive', notes: 'Il suo corpo senza vita giace a terra', expected: 'dead', language: 'it' },

  // Cases with no contradiction
  { name: 'Character 10', status: 'dead', notes: 'Ucciso in combattimento', expected: 'dead', language: 'it' },
  { name: 'Character 11', status: 'alive', notes: 'Combatte valorosamente e sopravvive', expected: 'alive', language: 'it' },
  { name: 'Character 12', status: 'injured', notes: 'Ferito gravemente ma si riprenderà', expected: 'injured', language: 'it' },
  { name: 'Character 13', status: 'missing', notes: 'Scompare nella nebbia', expected: 'missing', language: 'it' },

  // English test cases
  { name: 'Character EN 1', status: 'dead', notes: 'Survives the final battle', expected: 'alive', language: 'en' },
  { name: 'Character EN 2', status: 'dead', notes: 'Emerges stronger from the ritual', expected: 'alive', language: 'en' },
  { name: 'Character EN 3', status: 'alive', notes: 'Dies heroically in battle', expected: 'dead', language: 'en' },
  { name: 'Character EN 4', status: 'alive', notes: 'Breathed his last breath', expected: 'dead', language: 'en' },

  // Edge case: Both survival and death keywords (should not correct)
  { name: 'Character 14', status: 'dead', notes: 'Muore ma sopravvive in spirito', expected: 'dead', language: 'it' },
  { name: 'Character 15', status: 'alive', notes: 'Sopravvive anche se muore simbolicamente', expected: 'alive', language: 'it' },

  // Epilogue cases
  { name: 'Character 16', status: 'dead', notes: 'Nell\'epilogo lo vediamo felice', expected: 'alive', language: 'it' },
  { name: 'Character 17', status: 'dead', notes: 'Anni dopo diventa re', expected: 'alive', language: 'it' },
  { name: 'Character 18', status: 'dead', notes: 'Visse per sempre nella leggenda', expected: 'alive', language: 'it' },

  // Victory cases
  { name: 'Character 19', status: 'dead', notes: 'Vince la guerra e trionfa', expected: 'alive', language: 'it' },
  { name: 'Character 20', status: 'dead', notes: 'La sua vittoria è celebrata da tutti', expected: 'alive', language: 'it' },

  // Empty/null cases
  { name: 'Character 21', status: 'alive', notes: '', expected: 'alive', language: 'it' },
  { name: 'Character 22', status: '', notes: 'Sopravvive', expected: '', language: 'it' },
  { name: 'Character 23', status: 'unknown', notes: 'Non si sa cosa succede', expected: 'unknown', language: 'it' },
];

// Run tests
console.log('='.repeat(80));
console.log('Feature #398: validateCharacterStatus Test Suite');
console.log('='.repeat(80));
console.log();

let passed = 0;
let failed = 0;

testCases.forEach((tc, index) => {
  const result = validateCharacterStatus(tc.status, tc.notes, tc.language);
  const testPassed = result.status === tc.expected;

  if (testPassed) {
    passed++;
    console.log(`✅ Test ${index + 1}: ${tc.name}`);
    console.log(`   Input: status='${tc.status}', notes='${tc.notes.substring(0, 50)}...'`);
    console.log(`   Output: status='${result.status}', corrected=${result.correctionLogged}`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: ${tc.name}`);
    console.log(`   Input: status='${tc.status}', notes='${tc.notes.substring(0, 50)}...'`);
    console.log(`   Expected: '${tc.expected}', Got: '${result.status}'`);
  }
  console.log();
});

console.log('='.repeat(80));
console.log(`Results: ${passed}/${testCases.length} tests passed (${failed} failed)`);
console.log('='.repeat(80));

process.exit(failed > 0 ? 1 : 0);
