/**
 * AI Service for OmniWriter
 * Handles communication with OpenAI and Anthropic APIs for style analysis
 */

interface StyleAnalysisResult {
  tone: string;
  sentence_structure: string;
  vocabulary: string;
  patterns: string[];
}

interface AIProvider {
  name: string;
  apiKey: string | undefined;
  available: boolean;
}

// Check available AI providers
function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = [
    {
      name: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      available: !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key'
    },
    {
      name: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      available: !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your-anthropic-api-key'
    }
  ];

  return providers;
}

/**
 * Get the first available AI provider
 */
function getActiveProvider(): AIProvider | null {
  const providers = getAvailableProviders();
  return providers.find(p => p.available) || null;
}

/**
 * Check if AI is available (has valid API keys)
 */
export function isAIAvailable(): boolean {
  return getActiveProvider() !== null;
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
 * Call OpenAI API for style analysis
 */
async function callOpenAI(prompt: string, apiKey: string): Promise<StyleAnalysisResult> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert literary analyst. Analyze writing styles with precision and respond only with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('Empty response from OpenAI');
  }

  // Parse the JSON response
  try {
    const result = JSON.parse(content);
    return {
      tone: result.tone || 'Not specified',
      sentence_structure: result.sentence_structure || 'Not specified',
      vocabulary: result.vocabulary || 'Not specified',
      patterns: Array.isArray(result.patterns) ? result.patterns : []
    };
  } catch (parseError) {
    console.error('[AI-Service] Failed to parse OpenAI response:', content);
    throw new Error('Failed to parse AI response as JSON');
  }
}

/**
 * Call Anthropic API for style analysis
 */
async function callAnthropic(prompt: string, apiKey: string): Promise<StyleAnalysisResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error('Empty response from Anthropic');
  }

  // Parse the JSON response
  try {
    const result = JSON.parse(content);
    return {
      tone: result.tone || 'Not specified',
      sentence_structure: result.sentence_structure || 'Not specified',
      vocabulary: result.vocabulary || 'Not specified',
      patterns: Array.isArray(result.patterns) ? result.patterns : []
    };
  } catch (parseError) {
    console.error('[AI-Service] Failed to parse Anthropic response:', content);
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
    // Return a mock analysis when no API keys are configured
    return getMockAnalysis(language);
  }

  const prompt = buildStyleAnalysisPrompt(text, language);

  console.log(`[AI-Service] Calling ${provider.name} for style analysis in ${language}`);

  try {
    if (provider.name === 'openai') {
      return await callOpenAI(prompt, provider.apiKey!);
    } else if (provider.name === 'anthropic') {
      return await callAnthropic(prompt, provider.apiKey!);
    }

    throw new Error(`Unknown provider: ${provider.name}`);
  } catch (error) {
    console.error(`[AI-Service] Error calling ${provider.name}:`, error);
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

export default {
  analyzeWritingStyle,
  isAIAvailable
};
