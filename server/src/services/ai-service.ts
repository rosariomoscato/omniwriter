/**
 * AI Service for OmniWriter
 *
 * Legacy compatibility layer that wraps the new modular AI architecture.
 * This file maintains backward compatibility with existing code that imports
 * analyzeWritingStyle and isAIAvailable.
 *
 * New code should import directly from './ai' instead.
 */

import {
  getFirstAvailableProvider,
  createProvider,
  BaseProvider,
  ChatMessage,
  StyleAnalysisResult,
  ProviderType,
  ProviderConfig
} from './ai/index';

/**
 * Check if AI is available (has valid API keys)
 */
export function isAIAvailable(): boolean {
  return getFirstAvailableProvider() !== null;
}

/**
 * Get the active provider (first available from environment)
 */
function getActiveProvider(): BaseProvider | null {
  return getFirstAvailableProvider();
}

/**
 * Build the style analysis prompt based on language
 */
function buildStyleAnalysisPrompt(text: string, language: 'it' | 'en'): string {
  const isItalian = language === 'it';

  if (isItalian) {
    return `Analizza il seguente testo e crea un profilo stilistico dettagliato.

TESTO DA ANALIZZARE:
"""
${text.substring(0, 15000)}
"""

Fornisci un'analisi in italiano con la seguente struttura JSON:
{
  "tone": "Descrivi il tono generale del testo (es: formale, colloquiale, poetico, ironico, drammatico, giornalistico)",
  "sentence_structure": "Descrivi la struttura delle frasi (es: frasi lunghe e complesse, brevi e incisive, uso di subordinate, ritmo narrativo)",
  "vocabulary": "Descrivi il vocabolario utilizzato (es: ricercato, semplice, tecnico-settoriale, arcaico, moderno)",
  "patterns": ["Lista di 3-5 pattern di scrittura distintivi osservati nel testo"]
}

Rispondi SOLO con il JSON valido, senza testo aggiuntivo.`;
  }

  return `Analyze the following text and create a detailed stylistic profile.

TEXT TO ANALYZE:
"""
${text.substring(0, 15000)}
"""

Provide an analysis in English with the following JSON structure:
{
  "tone": "Describe the overall tone of the text (e.g., formal, conversational, poetic, ironic, dramatic, journalistic)",
  "sentence_structure": "Describe the sentence structure (e.g., long and complex sentences, short and punchy, use of subordinate clauses, narrative rhythm)",
  "vocabulary": "Describe the vocabulary used (e.g., sophisticated, simple, technical-specialized, archaic, modern)",
  "patterns": ["List of 3-5 distinctive writing patterns observed in the text"]
}

Respond with ONLY valid JSON, no additional text.`;
}

/**
 * Parse JSON response from AI
 */
function parseStyleAnalysis(content: string, language: 'it' | 'en'): StyleAnalysisResult {
  try {
    const result = JSON.parse(content);
    return {
      tone: result.tone || 'Not specified',
      sentence_structure: result.sentence_structure || 'Not specified',
      vocabulary: result.vocabulary || 'Not specified',
      patterns: Array.isArray(result.patterns) ? result.patterns : []
    };
  } catch (parseError) {
    console.error('[AI-Service] Failed to parse style analysis response:', content);
    throw new Error('Failed to parse AI response as JSON');
  }
}

/**
 * Analyze writing style from text using available AI provider
 */
export async function analyzeWritingStyle(
  text: string,
  language: 'it' | 'en' = 'it'
): Promise<StyleAnalysisResult> {
  const provider = getActiveProvider();

  if (!provider) {
    console.warn('[AI-Service] No AI provider available, returning mock analysis');
    return getMockAnalysis(language);
  }

  const prompt = buildStyleAnalysisPrompt(text, language);
  console.log(`[AI-Service] Using ${provider.getProviderType()} for style analysis in ${language}`);

  try {
    const response = await provider.chat(
      [
        {
          role: 'system',
          content: 'You are an expert literary analyst. Analyze writing styles with precision and respond only with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      {
        temperature: 0.7,
        maxTokens: 1000
      }
    );

    return parseStyleAnalysis(response.content, language);
  } catch (error) {
    console.error(`[AI-Service] Error calling ${provider.getProviderType()}:`, error);
    // Fallback to mock analysis on error
    return getMockAnalysis(language);
  }
}

/**
 * Generate mock analysis for development/demo purposes
 */
function getMockAnalysis(language: 'it' | 'en'): StyleAnalysisResult {
  if (language === 'it') {
    return {
      tone: 'Formale ma coinvolgente, con tono narrativo che alterna momenti descrittivi a dialoghi vivaci',
      sentence_structure: 'Frasi variate, con frequente uso di periodi composti e subordinate. Buon equilibrio tra frasi brevi e lunghe per creare ritmo',
      vocabulary: 'Vocabolario ricco e articolato, con termini specifici del settore e espressioni letterarie ricercate',
      patterns: [
        'Uso frequente di metafore e similitudini',
        'Dialoghi naturali con interruzioni realistiche',
        'Passaggi descrittivi dettagliati prima dei momenti chiave',
        'Ripetizione deliberata di temi e motivi',
        'Alternanza tra narrazione oggettiva e soggettiva'
      ]
    };
  }

  return {
    tone: 'Formal yet engaging, with a narrative tone that alternates between descriptive passages and lively dialogue',
    sentence_structure: 'Varied sentences, with frequent use of compound periods and subordinate clauses. Good balance between short and long sentences to create rhythm',
    vocabulary: 'Rich and articulate vocabulary, with specific technical terms and sophisticated literary expressions',
    patterns: [
      'Frequent use of metaphors and similes',
      'Natural dialogue with realistic interruptions',
      'Detailed descriptive passages before key moments',
      'Deliberate repetition of themes and motifs',
      'Alternation between objective and subjective narration'
    ]
  };
}

// Re-export new modular components for convenience
export {
  createProvider,
  getFirstAvailableProvider,
  BaseProvider,
  type ChatMessage,
  type StyleAnalysisResult,
  type ProviderType,
  type ProviderConfig
};

export default {
  analyzeWritingStyle,
  isAIAvailable,
  createProvider,
  getFirstAvailableProvider
};
