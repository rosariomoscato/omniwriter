/**
 * Content Moderation Utilities for AI Generation
 *
 * Provides functions to sanitize and limit content before sending to AI providers,
 * helping avoid content moderation filter triggers (especially on Amazon Bedrock).
 *
 * Feature #233: Fix AI content moderation error in chapter generation
 */

// Maximum character limits for different content types to avoid moderation triggers
const MAX_DESCRIPTION_LENGTH = 200;
const MAX_TRAIT_LENGTH = 100;
const MAX_SOURCE_EXCERPT_LENGTH = 300;
const MAX_PLOT_EVENT_LENGTH = 150;
const MAX_TOTAL_PROMPT_CHARS = 15000; // ~4000 tokens safety limit

// Patterns that commonly trigger content moderation
const SENSITIVE_PATTERNS = [
  // Violence patterns
  /\b(kill|murder|torture|rape|assault|blood|gore|decapitat|dismember|mutilat|slaughter|massacre|execution)\b/gi,
  // Graphic descriptions
  /\b(viscera|entrails|corpse|cadaver|mangled|severed|bloody|wound|injury)\b/gi,
  // Abuse patterns
  /\b(abuse|molest|pedophil|incest|traffick)\b/gi,
  // Hate speech indicators (even in fictional context can trigger)
  /\b(hate\s*(speech|group)|supremac|genocide|ethnic\s*cleansing)\b/gi,
  // Self-harm
  /\b(suicide|self.?harm|self.?destruct)\b/gi
];

// Replacement phrases for sensitive content
const REPLACEMENTS: Record<string, string> = {
  'kill': 'defeat',
  'kills': 'defeats',
  'killed': 'defeated',
  'killing': 'defeating',
  'murder': 'confrontation',
  'murders': 'confrontations',
  'murdered': 'confronted',
  'murdering': 'confronting',
  'torture': 'ordeal',
  'tortured': 'tested',
  'torturing': 'testing',
  'slaughter': 'battle',
  'slaughtered': 'fought',
  'massacre': 'conflict',
  'massacred': 'defeated',
  'blood': 'sweat',
  'bloody': 'intense',
  'gore': 'drama',
  'corpse': 'remains',
  'corpses': 'remains',
  'decapitate': 'defeat',
  'decapitated': 'defeated',
  'dismember': 'destroy',
  'dismembered': 'destroyed',
  'mutilate': 'damage',
  'mutilated': 'damaged',
  'viscera': 'aftermath',
  'entrails': 'remains',
  'mangled': 'affected',
  'severed': 'separated',
  'execution': 'judgment',
  'executed': 'judged'
};

/**
 * Sanitize text by replacing sensitive words with safer alternatives
 */
export function sanitizeSensitiveWords(text: string): string {
  if (!text) return '';

  let sanitized = text;

  // Apply word replacements
  for (const [sensitive, replacement] of Object.entries(REPLACEMENTS)) {
    // Use word boundary matching to avoid partial replacements
    const regex = new RegExp(`\\b${sensitive}\\b`, 'gi');
    sanitized = sanitized.replace(regex, replacement);
  }

  return sanitized;
}

/**
 * Check if text contains potentially sensitive content
 */
export function hasSensitiveContent(text: string): boolean {
  if (!text) return false;

  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Find which section contains sensitive content
 */
export function findSensitiveSections(sections: Record<string, string>): string[] {
  const problematic: string[] = [];

  for (const [name, content] of Object.entries(sections)) {
    if (hasSensitiveContent(content)) {
      problematic.push(name);
    }
  }

  return problematic;
}

/**
 * Truncate text to a maximum length, preserving word boundaries
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;

  // Find a good break point
  let breakPoint = text.lastIndexOf('.', maxLength);
  if (breakPoint < maxLength * 0.7) {
    breakPoint = text.lastIndexOf(' ', maxLength);
  }
  if (breakPoint < maxLength * 0.5) {
    breakPoint = maxLength;
  }

  return text.substring(0, breakPoint).trim() + '...';
}

/**
 * Sanitize and limit a character description
 */
export function sanitizeCharacterDescription(name: string, description: string, traits?: string): string {
  const sanitizedDesc = sanitizeSensitiveWords(truncateText(description || '', MAX_DESCRIPTION_LENGTH));
  const sanitizedTraits = traits ? sanitizeSensitiveWords(truncateText(traits, MAX_TRAIT_LENGTH)) : '';

  if (sanitizedTraits) {
    return `${name}: ${sanitizedDesc} (${sanitizedTraits})`;
  }
  return `${name}: ${sanitizedDesc}`;
}

/**
 * Sanitize and limit a location description
 */
export function sanitizeLocationDescription(name: string, description: string): string {
  const sanitized = sanitizeSensitiveWords(truncateText(description || '', MAX_DESCRIPTION_LENGTH));
  return `${name}: ${sanitized}`;
}

/**
 * Sanitize and limit a plot event description
 */
export function sanitizePlotEvent(title: string, description: string): string {
  const sanitizedTitle = sanitizeSensitiveWords(title);
  const sanitizedDesc = sanitizeSensitiveWords(truncateText(description || '', MAX_PLOT_EVENT_LENGTH));
  return `${sanitizedTitle}: ${sanitizedDesc}`;
}

/**
 * Sanitize source content excerpt
 */
export function sanitizeSourceExcerpt(fileName: string, content: string): string {
  const sanitized = sanitizeSensitiveWords(truncateText(content || '', MAX_SOURCE_EXCERPT_LENGTH));
  return `[${fileName}]: ${sanitized}`;
}

/**
 * Sanitize the complete prompt content for AI generation
 * Returns a sanitized version with content limits and sensitive word filtering
 */
export function sanitizePromptContent(data: {
  characters?: Array<{ name: string; description: string; traits?: string; status_at_end?: string; status_notes?: string }>;
  locations?: Array<{ name: string; description: string }>;
  plotEvents?: Array<{ title: string; description: string }>;
  sources?: Array<{ file_name: string; content_text: string }>;
  previousChapter?: { title: string; content?: string };
  chapterTitle: string;
  projectTitle: string;
  projectContext?: string;
}): {
  characters: string;
  deadCharacters: string;
  locations: string;
  plotEvents: string;
  sources: string;
  contextSummary: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  const sections: Record<string, string> = {};

  // Process characters - separate alive and dead
  let charactersSection = '';
  let deadCharactersSection = '';
  if (data.characters && data.characters.length > 0) {
    // Separate characters by status
    const aliveCharacters = data.characters.filter(c => c.status_at_end !== 'dead');
    const deadCharacters = data.characters.filter(c => c.status_at_end === 'dead');

    // Sanitize alive characters
    const sanitizedAlive = aliveCharacters.slice(0, 10).map(c => {
      let charDesc = sanitizeCharacterDescription(c.name, c.description, c.traits);
      // Add status notes for special states (injured, missing)
      if (c.status_at_end && c.status_at_end !== 'alive' && c.status_at_end !== 'unknown') {
        charDesc += ` [Status: ${c.status_at_end}]`;
      }
      if (c.status_notes) {
        charDesc += ` [Note: ${truncateText(c.status_notes, 100)}]`;
      }
      return charDesc;
    });
    charactersSection = sanitizedAlive.join('\n');
    sections.characters = charactersSection;

    // Sanitize dead characters separately
    if (deadCharacters.length > 0) {
      const sanitizedDead = deadCharacters.map(c => {
        let charDesc = `- ${c.name}`;
        if (c.status_notes) {
          charDesc += ` (${truncateText(c.status_notes, 100)})`;
        }
        return charDesc;
      });
      deadCharactersSection = sanitizedDead.join('\n');
    }

    if (data.characters.length > 10) {
      warnings.push('characters_limited');
    }
  }

  // Process locations
  let locationsSection = '';
  if (data.locations && data.locations.length > 0) {
    const sanitizedLocations = data.locations.slice(0, 10).map(l =>
      sanitizeLocationDescription(l.name, l.description)
    );
    locationsSection = sanitizedLocations.join('\n');
    sections.locations = locationsSection;

    if (data.locations.length > 10) {
      warnings.push('locations_limited');
    }
  }

  // Process plot events
  let plotEventsSection = '';
  if (data.plotEvents && data.plotEvents.length > 0) {
    const sanitizedEvents = data.plotEvents.slice(0, 15).map(e =>
      sanitizePlotEvent(e.title, e.description)
    );
    plotEventsSection = sanitizedEvents.join('\n');
    sections.plotEvents = plotEventsSection;

    if (data.plotEvents.length > 15) {
      warnings.push('plot_events_limited');
    }
  }

  // Process sources (most limited to avoid triggering moderation)
  let sourcesSection = '';
  if (data.sources && data.sources.length > 0) {
    const sanitizedSources = data.sources.slice(0, 3).map(s =>
      sanitizeSourceExcerpt(s.file_name, s.content_text || '')
    );
    sourcesSection = sanitizedSources.join('\n\n');
    sections.sources = sourcesSection;

    if (data.sources.length > 3) {
      warnings.push('sources_limited');
    }
  }

  // Check for sensitive sections
  const sensitiveSections = findSensitiveSections(sections);
  if (sensitiveSections.length > 0) {
    warnings.push(`sensitive_content_in:${sensitiveSections.join(',')}`);
  }

  // Build context summary
  let contextSummary = `Project: ${sanitizeSensitiveWords(data.projectTitle)}\nChapter: ${sanitizeSensitiveWords(data.chapterTitle)}`;

  if (data.previousChapter) {
    const prevContent = data.previousChapter.content
      ? truncateText(data.previousChapter.content, 200)
      : '';
    contextSummary += `\nPrevious Chapter: ${sanitizeSensitiveWords(data.previousChapter.title)}`;
    if (prevContent) {
      contextSummary += `\nPrevious Context: ${sanitizeSensitiveWords(prevContent)}`;
    }
  }

  if (data.projectContext) {
    contextSummary += `\nNotes: ${sanitizeSensitiveWords(truncateText(data.projectContext, 200))}`;
  }

  return {
    characters: charactersSection,
    deadCharacters: deadCharactersSection,
    locations: locationsSection,
    plotEvents: plotEventsSection,
    sources: sourcesSection,
    contextSummary,
    warnings
  };
}

/**
 * Build a simplified prompt for retry after moderation error
 * This creates a minimal prompt with just the essential information
 */
export function buildSimplifiedPrompt(
  chapterTitle: string,
  projectTitle: string,
  language: 'it' | 'en'
): { systemPrompt: string; userPrompt: string } {
  const isItalian = language === 'it';

  if (isItalian) {
    return {
      systemPrompt: `Sei uno scrittore professionista che crea capitoli di romanzi.

PROGETTO: "${projectTitle}"
CAPITOLO: "${chapterTitle}"

Scrivi un capitolo creativo e coinvolgente. Evita contenuti violenti o espliciti.`,
      userPrompt: `Scrivi il contenuto completo del capitolo "${chapterTitle}".

Scrivi un capitolo di circa 2000 parole in italiano, con una narrazione fluida e personaggi interessanti.`
    };
  }

  return {
    systemPrompt: `You are a professional writer creating novel chapters.

PROJECT: "${projectTitle}"
CHAPTER: "${chapterTitle}"

Write a creative and engaging chapter. Avoid violent or explicit content.`,
    userPrompt: `Write the complete content for chapter "${chapterTitle}".

Write a chapter of approximately 2000 words in English, with fluid narration and interesting characters.`
  };
}

/**
 * Check if an error is a moderation/content filter error
 */
export function isModerationError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage = error instanceof Error
    ? error.message.toLowerCase()
    : String(error).toLowerCase();

  const moderationKeywords = [
    'moderation',
    'content_filter',
    'content filter',
    'flagged',
    'violence',
    'graphic',
    'harmful',
    'inappropriate',
    'policy',
    'safety'
  ];

  return moderationKeywords.some(keyword => errorMessage.includes(keyword));
}

/**
 * Generate a user-friendly error message for moderation failures
 */
export function getModerationErrorMessage(
  language: 'it' | 'en',
  warnings?: string[]
): string {
  const isItalian = language === 'it';

  let suggestion = '';
  if (warnings && warnings.length > 0) {
    const sensitiveSections = warnings
      .filter(w => w.startsWith('sensitive_content_in:'))
      .map(w => w.replace('sensitive_content_in:', '').split(','));

    if (sensitiveSections.length > 0) {
      const sections = sensitiveSections.flat();
      const sectionNames = sections.map(s => {
        if (s === 'characters') return isItalian ? 'personaggi' : 'characters';
        if (s === 'locations') return isItalian ? 'luoghi' : 'locations';
        if (s === 'plotEvents') return isItalian ? 'eventi di trama' : 'plot events';
        if (s === 'sources') return isItalian ? 'fonti' : 'sources';
        return s;
      });

      suggestion = isItalian
        ? ` Potenzialmente problematico: ${sectionNames.join(', ')}.`
        : ` Potentially problematic: ${sectionNames.join(', ')}.`;
    }
  }

  if (isItalian) {
    return `Il filtro di moderazione AI ha bloccato la generazione. Contenuto nel prompt potrebbe essere stato segnalato come sensibile.${suggestion} Prova a semplificare le descrizioni di personaggi, luoghi o eventi.`;
  }

  return `AI moderation filter blocked generation. Content in the prompt may have been flagged as sensitive.${suggestion} Try simplifying character, location, or event descriptions.`;
}
