/**
 * Test script for Feature #396: Character Status Detection Fix
 *
 * Tests that the improved analyzeCharacterStatusInText function correctly:
 * 1. Marks characters as dead only with explicit death indicators
 * 2. Recognizes survival patterns (emerges, recovers, survives)
 * 3. Does NOT mark characters as dead just for having "blood" or being in battles
 */

function analyzeCharacterStatusInText(characterName, chaptersContent, language = 'it') {
  const name = characterName.trim();
  if (!name || !chaptersContent) {
    return { status: 'unknown', notes: '' };
  }

  const content = chaptersContent.toLowerCase();
  const nameLower = name.toLowerCase();

  // Escape special regex characters in name
  const escapedName = nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Find all occurrences of the character name with surrounding context
  const namePattern = new RegExp(`.{0,100}${escapedName}.{0,100}`, 'gi');
  const matches = chaptersContent.match(namePattern) || [];
  const context = matches.join(' ... ').toLowerCase();

  const isItalian = language === 'it';

  // Helper: Check if any keyword exists in context
  const hasKeyword = (keywords) => {
    return keywords.some(kw => context.includes(kw.toLowerCase()));
  };

  // ALIVE keywords - if these appear anywhere with character, they're alive
  // Note: These must NOT appear in a negative context (e.g., "non si rialzò")
  const aliveKeywordsIt = [
    'sopravvive', 'sopravvisse', 'si salvò',
    'vivo', 'viva', 'si riprese', 'guarì', 'guari',
    'emerse', 'si riprend',
    'celebrò', 'celebra', 'festeggi', 'trionf', 'vinse', 'vittoria',
    'alla fine', 'nell\'epilogo', 'nel finale', 'visse per', 'regna', 'governa',
    'abbracciò', 'sorrise', 'pianto di gioia', 'felice',
    'anni dopo', 'continuò'
  ];

  const aliveKeywordsEn = [
    'survives', 'survived', 'escaped', 'alive', 'safe', 'recovered', 'healed',
    'got back up', 'rose again', 'emerged stronger',
    'celebrated', 'triumph', 'won', 'victory',
    'in the end', 'in the epilogue', 'in the finale', 'lived for', 'reigns', 'rules',
    'hugged', 'smiled', 'tears of joy', 'happy',
    'years later', 'continued'
  ];

  // DEAD keywords - require EXPLICIT death confirmation
  const deadKeywordsIt = [
    'è morto', 'è morta', 'morì', 'muore', 'perì', 'spirò', 'decedette',
    'fu ucciso', 'fu uccisa', 'venne ucciso', 'venne uccisa',
    'è stato ucciso', 'è stata uccisa',
    'ultimo respiro', 'esalò l\'ultimo respiro', 'smise di respirare',
    'occhi si chiusero per sempre', 'corpo senza vita', 'cadavere di',
    'morì tra le braccia', 'spirò tra le braccia',
    'morì da eroe',
    'non si rialzò più', 'non si mosse più', 'non si riprese mai',
    'colpito a morte'
  ];

  const deadKeywordsEn = [
    'is dead', 'was dead', 'died', 'has died', 'perished', 'passed away', 'expired',
    'was killed', 'was murdered', 'was slain', 'got killed',
    'last breath', 'breathed his last', 'breathed her last', 'stopped breathing',
    'eyes closed forever', 'lifeless body', 'corpse of',
    'died in his arms', 'died in her arms', 'died in their arms',
    'never got back up', 'never rose again', 'never moved again', 'never recovered'
  ];

  // INJURY keywords - wounded but no explicit death or recovery
  const injuryKeywordsIt = [
    'fu ferito', 'fu ferita', 'venne ferito', 'venne ferita',
    'è stato ferito', 'è stata ferita', 'rimase ferito', 'rimase ferita',
    'fu colpito', 'fu colpita', 'venne colpito', 'venne colpita',
    'ferito gravemente', 'ferita gravemente',
    'sanguinava', 'perdeva sangue', 'aveva una ferita',
    'cadde a terra', 'strisciò', 'zoppicava'
  ];

  const injuryKeywordsEn = [
    'was wounded', 'was injured', 'got wounded', 'got injured', 'remained injured',
    'was bleeding', 'had a wound', 'bled',
    'fell to the ground', 'crawled', 'limped'
  ];

  // Death patterns that require name in same sentence
  const deathPatternIt = new RegExp(`la morte di ${escapedName}`, 'i');
  const deathPatternEn = new RegExp(`the death of ${escapedName}`, 'i');

  // Sacrifice pattern (need both sacrifice AND death)
  const sacrificePatternIt = new RegExp(`${escapedName}[^.!?]*(?:si sacrificò|sacrificò la propria vita)`, 'i');
  const sacrificePatternEn = new RegExp(`${escapedName}[^.!?]*(?:sacrificed (?:himself|herself|themselves)|gave (?:his|her|their) life)`, 'i');

  const aliveKeywords = isItalian ? aliveKeywordsIt : aliveKeywordsEn;
  const deadKeywords = isItalian ? deadKeywordsIt : deadKeywordsEn;
  const injuryKeywords = isItalian ? injuryKeywordsIt : injuryKeywordsEn;
  const deathPattern = isItalian ? deathPatternIt : deathPatternEn;
  const sacrificePattern = isItalian ? sacrificePatternIt : sacrificePatternEn;

  // STEP 1: Check for ALIVE indicators (highest priority)
  if (hasKeyword(aliveKeywords)) {
    return { status: 'alive', pattern: 'alive keyword' };
  }

  // STEP 2: Check for explicit DEATH indicators
  if (deathPattern.test(context)) {
    return { status: 'dead', pattern: 'death of X pattern' };
  }

  if (sacrificePattern.test(context) && hasKeyword(deadKeywords)) {
    return { status: 'dead', pattern: 'sacrifice + death' };
  }

  if (hasKeyword(deadKeywords)) {
    return { status: 'dead', pattern: 'death keyword' };
  }

  // STEP 3: Check for INJURY indicators
  if (hasKeyword(injuryKeywords)) {
    return { status: 'injured', pattern: 'injury keyword' };
  }

  return { status: 'unknown', pattern: null };
}

// Test cases
const testCases = [
  // CASE 1: Character who is in a battle with blood but SURVIVES (was incorrectly marked as dead)
  {
    name: 'Marco',
    content: `La battaglia infuriava. Marco combatteva con tutte le sue forze. Il sangue usciva dalla sua spalla ferita, ma continuò a lottare. Alla fine, Marco emerse più forte che mai, celebrando la vittoria con i suoi compagni.`,
    expected: 'alive',
    description: 'Battle with blood but survives and celebrates'
  },

  // CASE 2: Character who is explicitly killed
  {
    name: 'Lucio',
    content: `Lucio morì tra le braccia del suo compagno. I suoi occhi si chiusero per sempre mentre esalava l'ultimo respiro.`,
    expected: 'dead',
    description: 'Explicit death scene'
  },

  // CASE 3: Character wounded but recovers
  {
    name: 'Elena',
    content: `Elena fu ferita gravemente nello scontro. Perdeva sangue dalla gamba, ma si riprese dopo alcuni giorni di cure.`,
    expected: 'alive',
    description: 'Wounded but recovers (si riprese)'
  },

  // CASE 4: Character in battle with "sangue" mention but gets back up
  {
    name: 'Alessandro',
    content: `Alessandro cadde a terra, sanguinando dalla testa. Ma si rialzò subito e continuò a combattere. Alla fine vinse la battaglia.`,
    expected: 'alive',
    description: 'Fallen with blood but gets back up (si rialzò) and wins (vinse)'
  },

  // CASE 5: Character mentioned near death of another (should NOT be marked dead)
  {
    name: 'Francesco',
    content: `L'assassino uccise Marco davanti agli occhi di Francesco. Francesco sopravvisse e giurò vendetta.`,
    expected: 'alive',
    description: 'Witness to death, not the victim (sopravvisse)'
  },

  // CASE 6: Explicit "la morte di" reference (should be dead)
  {
    name: 'Giovanni',
    content: `La morte di Giovanni scosse l'intero villaggio. Il suo corpo senza vita fu trovato sulla riva del fiume.`,
    expected: 'dead',
    description: 'Explicit death reference (la morte di)'
  },

  // CASE 7: Character in epilogue (alive)
  {
    name: 'Maria',
    content: `Maria visse per molti anni dopo la guerra. Nell'epilogo, la vediamo governare il regno con saggezza.`,
    expected: 'alive',
    description: 'Character in epilogue (visse per, epilogo)'
  },

  // CASE 8: Character "uccise" someone else (NOT killed themselves)
  {
    name: 'Roberto',
    content: `Roberto uccise il nemico con un colpo preciso. Poi tornò a casa dalla sua famiglia.`,
    expected: 'unknown',
    description: 'Character killed someone else, not themselves - no explicit status'
  },

  // CASE 9: Character sacrificed and died
  {
    name: 'Pietro',
    content: `Pietro si sacrificò per salvare i suoi amici. Morì da eroe, il suo corpo senza vita fu onorato da tutti.`,
    expected: 'dead',
    description: 'Explicit sacrifice with death (morì da eroe)'
  },

  // CASE 10: Character wounded, status unknown without recovery info
  {
    name: 'Anna',
    content: `Anna fu colpita dalla freccia nemica. Il sangue macchiava la sua armatura.`,
    expected: 'injured',
    description: 'Wounded (fu colpita) but no death or recovery confirmation'
  },

  // CASE 11: Character mentioned with "sangue" but clearly alive
  {
    name: 'Carlo',
    content: `Carlo aveva sangue sul viso dalla battaglia, ma era vivo e stava bene. Abbracciò i suoi figli al ritorno.`,
    expected: 'alive',
    description: 'Blood on face but explicitly alive (vivo, abbracciò)'
  },

  // CASE 12: Character never rose again (dead)
  {
    name: 'Lorenzo',
    content: `Lorenzo cadde colpito a morte. Non si rialzò più.`,
    expected: 'dead',
    description: 'Colpito a morte, non si rialzò più'
  },

  // CASE 13: Character wounded gravemente (injured, not dead)
  {
    name: 'Sofia',
    content: `Sofia fu ferita gravemente nello scontro. I medici fecero il possibile.`,
    expected: 'injured',
    description: 'Wounded gravemente - injured'
  },

  // CASE 14: Character who fought in battle and celebrates (alive)
  {
    name: 'Andrea',
    content: `Andrea combatté valorosamente nella battaglia. Quando tutto finì, celebrò la vittoria con i suoi compagni.`,
    expected: 'alive',
    description: 'Fought in battle then celebrated (celebrò, vittoria)'
  },

  // CASE 15: Character whose body was found lifeless (dead)
  {
    name: 'Michele',
    content: `Il cadavere di Michele fu trovato all'alba. Era stato ucciso durante la notte.`,
    expected: 'dead',
    description: 'Cadavere di, ucciso - dead'
  },
];

console.log('='.repeat(60));
console.log('Testing Feature #396: Character Status Detection Fix');
console.log('='.repeat(60));
console.log();

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = analyzeCharacterStatusInText(testCase.name, testCase.content, 'it');
  const success = result.status === testCase.expected;

  if (success) {
    passed++;
    console.log(`✅ PASS: ${testCase.description}`);
  } else {
    failed++;
    console.log(`❌ FAIL: ${testCase.description}`);
    console.log(`   Character: ${testCase.name}`);
    console.log(`   Expected: ${testCase.expected}`);
    console.log(`   Got: ${result.status} (${result.pattern || 'no pattern'})`);
  }
}

console.log();
console.log('='.repeat(60));
console.log(`Results: ${passed}/${testCases.length} tests passed`);
console.log(`Pass rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

if (failed > 0) {
  process.exit(1);
}
