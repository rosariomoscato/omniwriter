/**
 * AI Service for OmniWriter
 *
 * Legacy compatibility layer that wraps the new modular AI architecture.
 * This file maintains backward compatibility with existing code that imports
 * analyzeWritingStyle and isAIAvailable.
 *
 * New code should import directly from './ai' instead.
 *
 * Also supports user-configured providers from the database (llm_providers table).
 */

import crypto from 'crypto';
import {
  getFirstAvailableProvider,
  createProvider,
  BaseProvider,
  ChatMessage,
  StyleAnalysisResult,
  ProviderType,
  ProviderConfig
} from './ai/index';

// Database provider configuration interface
interface DBProviderConfig {
  id: string;
  provider_type: ProviderType;
  api_key_encrypted: string;
  api_base_url: string | null;
  selected_model_id: string | null;
}

/**
 * Decrypt API key from database
 * Uses the same encryption scheme as llm-providers.ts
 */
function decryptApiKey(encrypted: string): string {
  const secret = process.env.JWT_SECRET || 'omniwriter-dev-jwt-secret-2024';
  const key = crypto.scryptSync(secret, 'omniwriter-salt', 32);
  const parts = encrypted.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Get user's selected AI provider from database
 * Returns null if user has no selected provider or if provider is not configured
 */
export function getUserProviderFromDB(userId: string): BaseProvider | null {
  try {
    // Import database lazily to avoid circular dependencies
    const { getDatabase } = require('../db/database');
    const db = getDatabase();

    // Get user's selected provider
    const prefs = db.prepare(`
      SELECT up.selected_provider_id, up.selected_model_id
      FROM user_preferences up
      WHERE up.user_id = ?
    `).get(userId) as { selected_provider_id: string | null; selected_model_id: string | null } | undefined;

    if (!prefs?.selected_provider_id) {
      console.log('[AI-Service] No selected provider in user preferences');
      return null;
    }

    // Get provider details
    const provider = db.prepare(`
      SELECT id, provider_type, api_key_encrypted, api_base_url
      FROM llm_providers
      WHERE id = ? AND user_id = ? AND is_active = 1
    `).get(prefs.selected_provider_id, userId) as DBProviderConfig | undefined;

    if (!provider) {
      console.log('[AI-Service] Selected provider not found or inactive');
      return null;
    }

    // Decrypt API key
    const apiKey = decryptApiKey(provider.api_key_encrypted);

    // Create provider instance
    const config: ProviderConfig = {
      apiKey,
      baseUrl: provider.api_base_url || undefined,
      defaultModel: prefs.selected_model_id || undefined
    };

    console.log(`[AI-Service] Creating ${provider.provider_type} provider from user configuration`);
    return createProvider(provider.provider_type, config);
  } catch (error) {
    console.error('[AI-Service] Error getting user provider from DB:', error);
    return null;
  }
}

/**
 * Check if AI is available (has valid API keys)
 */
export function isAIAvailable(): boolean {
  return getFirstAvailableProvider() !== null;
}

/**
 * Check if user has a configured provider in database
 */
export function hasUserProvider(userId: string): boolean {
  return getUserProviderFromDB(userId) !== null;
}

/**
 * Get the active provider (first available from environment)
 */
function getActiveProvider(): BaseProvider | null {
  return getFirstAvailableProvider();
}

/**
 * Get provider for user - tries user's configured provider first, falls back to env
 */
export function getProviderForUser(userId?: string): BaseProvider | null {
  // First try user's configured provider from database
  if (userId) {
    const userProvider = getUserProviderFromDB(userId);
    if (userProvider) {
      console.log('[AI-Service] Using user-configured provider');
      return userProvider;
    }
  }

  // Fall back to environment-configured provider
  console.log('[AI-Service] Falling back to environment-configured provider');
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
${text}
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
${text}
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
 * Maximum characters per chunk (roughly ~4000 tokens, leaving room for system prompt)
 */
const MAX_CHUNK_SIZE = 12000;

/**
 * Split text into chunks for processing if it exceeds the limit
 */
function chunkText(text: string, maxSize: number = MAX_CHUNK_SIZE): string[] {
  if (text.length <= maxSize) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxSize) {
      chunks.push(remaining);
      break;
    }

    // Try to find a good break point (end of paragraph or sentence)
    let breakPoint = remaining.lastIndexOf('\n\n', maxSize);
    if (breakPoint < maxSize * 0.5) {
      breakPoint = remaining.lastIndexOf('.\n', maxSize);
    }
    if (breakPoint < maxSize * 0.5) {
      breakPoint = remaining.lastIndexOf('. ', maxSize);
    }
    if (breakPoint < maxSize * 0.5) {
      breakPoint = remaining.lastIndexOf(' ', maxSize);
    }
    if (breakPoint < maxSize * 0.3) {
      breakPoint = maxSize; // Force break if no good point found
    }

    chunks.push(remaining.substring(0, breakPoint + 1));
    remaining = remaining.substring(breakPoint + 1).trim();
  }

  return chunks;
}

/**
 * Build a prompt for aggregating multiple analysis results
 */
function buildAggregationPrompt(analyses: StyleAnalysisResult[], language: 'it' | 'en'): string {
  const isItalian = language === 'it';
  const analysesJson = JSON.stringify(analyses, null, 2);

  if (isItalian) {
    return `Ho analizzato diverse porzioni di un testo lungo. Ecco i risultati delle singole analisi:

${analysesJson}

Crea un'analisi stilistica unificata che sintetizza questi risultati in un profilo coerente.
Rispondi SOLO con un JSON con la seguente struttura:
{
  "tone": "Tono unificato",
  "sentence_structure": "Struttura delle frasi unificata",
  "vocabulary": "Vocabolario unificato",
  "patterns": ["Pattern comuni e distintivi"]
}`;
  }

  return `I have analyzed different portions of a long text. Here are the individual analysis results:

${analysesJson}

Create a unified stylistic analysis that synthesizes these results into a coherent profile.
Respond ONLY with a JSON with the following structure:
{
  "tone": "Unified tone",
  "sentence_structure": "Unified sentence structure",
  "vocabulary": "Unified vocabulary",
  "patterns": ["Common and distinctive patterns"]
}`;
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
 * Analyze a single chunk of text
 */
async function analyzeChunk(
  provider: BaseProvider,
  chunk: string,
  language: 'it' | 'en'
): Promise<StyleAnalysisResult> {
  const prompt = buildStyleAnalysisPrompt(chunk, language);

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
}

/**
 * Analyze writing style from text using available AI provider
 * @param text - The text to analyze
 * @param language - The language for the analysis response ('it' or 'en')
 * @param userId - Optional user ID to use their configured provider
 */
export async function analyzeWritingStyle(
  text: string,
  language: 'it' | 'en' = 'it',
  userId?: string
): Promise<StyleAnalysisResult> {
  // Try to get user's provider first, then fall back to environment
  const provider = userId ? getProviderForUser(userId) : getActiveProvider();

  if (!provider) {
    throw new Error('No AI provider available. Please configure an AI provider in your environment variables or user settings.');
  }

  console.log(`[AI-Service] Using ${provider.getProviderType()} for style analysis in ${language}`);

  try {
    // Check if text needs to be chunked
    const chunks = chunkText(text, MAX_CHUNK_SIZE);
    console.log(`[AI-Service] Text split into ${chunks.length} chunk(s)`);

    if (chunks.length === 1) {
      // Single chunk - simple analysis
      return await analyzeChunk(provider, chunks[0], language);
    }

    // Multiple chunks - analyze each and aggregate
    console.log('[AI-Service] Analyzing multiple chunks...');
    const analyses: StyleAnalysisResult[] = [];

    for (let i = 0; i < chunks.length; i++) {
      console.log(`[AI-Service] Analyzing chunk ${i + 1}/${chunks.length}`);
      try {
        const result = await analyzeChunk(provider, chunks[i], language);
        analyses.push(result);
      } catch (chunkError) {
        console.warn(`[AI-Service] Failed to analyze chunk ${i + 1}:`, chunkError);
        // Continue with other chunks
      }
    }

    if (analyses.length === 0) {
      throw new Error('All text chunk analyses failed. Please check your AI provider configuration and try again.');
    }

    if (analyses.length === 1) {
      // Only one chunk succeeded
      return analyses[0];
    }

    // Aggregate multiple analyses
    console.log('[AI-Service] Aggregating analysis results...');
    const aggregationPrompt = buildAggregationPrompt(analyses, language);

    const aggregationResponse = await provider.chat(
      [
        {
          role: 'system',
          content: 'You are an expert literary analyst. Synthesize multiple analyses into a coherent unified profile. Respond only with valid JSON.'
        },
        {
          role: 'user',
          content: aggregationPrompt
        }
      ],
      {
        temperature: 0.5,
        maxTokens: 1000
      }
    );

    return parseStyleAnalysis(aggregationResponse.content, language);
  } catch (error) {
    console.error(`[AI-Service] Error calling ${provider.getProviderType()}:`, error);
    throw new Error(`AI provider error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
  getFirstAvailableProvider,
  getProviderForUser,
  getUserProviderFromDB,
  hasUserProvider
};
