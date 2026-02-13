/**
 * AI Service Module - Unified Export
 *
 * This module provides a unified interface for multiple AI providers.
 *
 * Usage:
 * ```typescript
 * import { createProvider, getFirstAvailableProvider } from './services/ai';
 *
 * // Create a specific provider
 * const openai = createProvider('openai', { apiKey: 'sk-...' });
 * const response = await openai.chat([
 *   { role: 'user', content: 'Hello!' }
 * ]);
 *
 * // Or use the first available provider from environment
 * const provider = getFirstAvailableProvider();
 * if (provider) {
 *   const result = await provider.complete('Write a poem');
 * }
 * ```
 *
 * Supported providers:
 * - OpenAI (GPT-4, GPT-3.5, etc.)
 * - Anthropic (Claude 3 family)
 * - Google Gemini
 * - OpenRouter (multi-model aggregator)
 * - Requesty (multi-model aggregator)
 * - Custom (self-hosted OpenAI-compatible endpoints)
 */

// Types
export * from './types';

// Base class
export { BaseProvider } from './BaseProvider';

// Provider implementations
export { OpenAIProvider } from './providers/OpenAIProvider';
export { AnthropicProvider } from './providers/AnthropicProvider';
export { GeminiProvider } from './providers/GeminiProvider';
export { OpenRouterProvider } from './providers/OpenRouterProvider';
export { RequestyProvider } from './providers/RequestyProvider';
export { CustomProvider } from './providers/CustomProvider';

// Factory functions
export {
  createProvider,
  createProviderFromEnv,
  getFirstAvailableProvider,
  isAnyProviderAvailable,
  getAvailableProviderTypes,
  clearProviderCache,
  removeProviderFromCache
} from './AIServiceFactory';
