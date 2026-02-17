/**
 * Backend localization helper for analysis messages
 * Supports Italian (it) and English (en)
 */

type Language = 'it' | 'en';

// Translation keys for plot hole detection and consistency check
const translations = {
  // Plot Hole Detection - Character issues
  characterDisappears: {
    it: (charName: string, chapterTitle: string) =>
      `Il personaggio "${charName}" scompare dalla storia dopo il capitolo "${chapterTitle}" senza una risoluzione`,
    en: (charName: string, chapterTitle: string) =>
      `Character "${charName}" disappears from the story after chapter "${chapterTitle}" without resolution`
  },
  characterDisappearsSuggestion: {
    it: (charName: string) =>
      `Considera di far tornare ${charName} per una risoluzione o di spiegare la sua assenza`,
    en: (charName: string) =>
      `Consider bringing ${charName} back for a resolution or explaining their absence`
  },
  characterReappears: {
    it: (charName: string, gap: number) =>
      `Il personaggio "${charName}" riappare dopo una lunga assenza (${gap} capitoli)`,
    en: (charName: string, gap: number) =>
      `Character "${charName}" reappears after a long absence (${gap} chapters)`
  },
  characterReappearsSuggestion: {
    it: (charName: string) =>
      `Aggiungi un breve riferimento a ${charName} durante la sua assenza per mantenere la continuità`,
    en: (charName: string) =>
      `Add a brief reference to ${charName} during their absence to maintain continuity`
  },

  // Timeline issues
  timelineInconsistency: {
    it: (prevTitle: string, currTitle: string) =>
      `Possibile incoerenza temporale tra "${prevTitle}" e "${currTitle}"`,
    en: (prevTitle: string, currTitle: string) =>
      `Possible timeline inconsistency between "${prevTitle}" and "${currTitle}"`
  },
  timelineInconsistencySuggestion: {
    it: 'Chiarisci la transizione temporale o modifica l\'interruzione della scena per rendere chiaro il salto temporale',
    en: 'Clarify the time transition or adjust the scene break to make the time jump clear'
  },
  timeOfDayShifts: {
    it: (chapterTitle: string) =>
      `Il capitolo "${chapterTitle}" ha frequenti cambiamenti di orario che potrebbero confondere`,
    en: (chapterTitle: string) =>
      `Chapter "${chapterTitle}" has frequent time-of-day shifts that may be confusing`
  },
  timeOfDayShiftsSuggestion: {
    it: 'Considera di strutturare le scene in modo più chiaro o di aggiungere interruzioni per indicare i cambiamenti temporali',
    en: 'Consider structuring scenes more clearly or adding scene breaks to indicate time changes'
  },

  // Unexplained plot developments
  majorDevelopmentLacksSetup: {
    it: (chapterTitle: string) =>
      `Un importante sviluppo in "${chapterTitle}" potrebbe mancare di una preparazione adeguata`,
    en: (chapterTitle: string) =>
      `Major development in "${chapterTitle}" may lack proper setup`
  },
  majorDevelopmentLacksSetupSuggestion: {
    it: 'Aggiungi sottili indizi nei capitoli precedenti per rendere questo sviluppo più naturale',
    en: 'Add subtle foreshadowing in earlier chapters to make this development feel earned'
  },

  // Logical inconsistencies
  logicalContradiction: {
    it: (chapterTitle: string, description: string) =>
      `Possibile contraddizione logica in "${chapterTitle}": ${description}`,
    en: (chapterTitle: string, description: string) =>
      `Possible logical contradiction in "${chapterTitle}": ${description}`
  },
  logicalContradictionSuggestion: {
    it: 'Rivedi il contesto per assicurarti che l\'affermazione abbia senso',
    en: 'Review the context to ensure the statement makes sense'
  },
  knowledgeContradictionIt: 'contraddizione della conoscenza del personaggio',
  knowledgeContradictionEn: 'character knowledge contradiction',
  absoluteContradictionIt: 'contraddizione di affermazione assoluta',
  absoluteContradictionEn: 'absolute statement contradiction',
  logicalImpossibilityIt: 'impossibilità logica',
  logicalImpossibilityEn: 'logical impossibility',
  characterKnowledgeInconsistency: {
    it: (chapterTitle: string) =>
      `Incoerenza nella conoscenza del personaggio in "${chapterTitle}"`,
    en: (chapterTitle: string) =>
      `Character knowledge inconsistency in "${chapterTitle}"`
  },
  characterKnowledgeSuggestion: {
    it: 'Assicurati che gli stati di conoscenza del personaggio siano coerenti',
    en: 'Ensure character knowledge states are consistent'
  },

  // Resolution gaps
  unresolvedPlotPoint: {
    it: (chapterTitle: string) =>
      `Potenziale punto di trama irrisolto da "${chapterTitle}"`,
    en: (chapterTitle: string) =>
      `Potential unresolved plot point from "${chapterTitle}"`
  },
  unresolvedPlotPointSuggestion: {
    it: 'Considera di affrontare questo punto della trama nella risoluzione della storia',
    en: 'Consider addressing this plot point in the story\'s resolution'
  },

  // Consistency Check - Character description issues
  characterDescriptionChange: {
    it: (charName: string, desc1: string, desc2: string, chapter1: string, chapter2: string) =>
      `La descrizione di "${charName}" cambia in modo incoerente: "${desc1}" vs "${desc2}"`,
    en: (charName: string, desc1: string, desc2: string, chapter1: string, chapter2: string) =>
      `Description of "${charName}" changes inconsistently: "${desc1}" vs "${desc2}"`
  },
  characterDescriptionSuggestion: {
    it: 'Mantieni una descrizione coerente del personaggio o spiega esplicitamente il cambiamento',
    en: 'Maintain a consistent character description or explicitly explain the change'
  },

  // Location description issues
  locationDescriptionChange: {
    it: (locName: string, chapter1: string, chapter2: string) =>
      `La descrizione di "${locName}" sembra cambiare tra i capitoli`,
    en: (locName: string, chapter1: string, chapter2: string) =>
      `Description of "${locName}" appears to change between chapters`
  },
  locationDescriptionSuggestion: {
    it: 'Assicurati che i dettagli della posizione rimangano coerenti',
    en: 'Ensure location details remain consistent'
  },

  // Character trait issues
  traitInconsistency: {
    it: (charName: string, trait: string, chapter1: string, chapter2: string) =>
      `Il tratto "${trait}" di "${charName}" sembra contraddittorio tra i capitoli`,
    en: (charName: string, trait: string, chapter1: string, chapter2: string) =>
      `Trait "${trait}" of "${charName}" appears contradictory between chapters`
  },
  traitInconsistencySuggestion: {
    it: 'Sviluppa i tratti del personaggio in modo coerente o mostra una chiara evoluzione',
    en: 'Develop character traits consistently or show clear character evolution'
  },

  // Timeline continuity issues
  timelineGap: {
    it: (chapter1: string, chapter2: string) =>
      `Possibile salto temporale non spiegato tra "${chapter1}" e "${chapter2}"`,
    en: (chapterTitle: string, chapter2: string) =>
      `Possible unexplained time gap between "${chapter1}" and "${chapter2}"`
  },
  timelineGapSuggestion: {
    it: 'Aggiungi una transizione temporale o riferimento al tempo trascorso',
    en: 'Add a time transition or reference to elapsed time'
  },
  timelineOverlap: {
    it: (chapter1: string, chapter2: string) =>
      `Possibile sovrapposizione temporale tra "${chapter1}" e "${chapter2}"`,
    en: (chapter1: string, chapter2: string) =>
      `Possible timeline overlap between "${chapter1}" and "${chapter2}"`
  },
  timelineOverlapSuggestion: {
    it: 'Verifica la sequenza degli eventi e assicurati che la timeline sia coerente',
    en: 'Check event sequence and ensure timeline is coherent'
  }
};

// Helper function to get translation
export function t(key: keyof typeof translations, lang: Language = 'it', ...args: (string | number)[]): string {
  const translation = translations[key];
  if (typeof translation === 'string') {
    return lang === 'it' ? (translations[`${key}It`] as string) : (translations[`${key}En`] as string);
  }
  // It's a function
  const fn = translation[lang] || translation['en'];
  return fn(...args as string[]);
}

// Export types
export type { Language };
