/**
 * AI Service Factory
 * Creates and caches AI provider instances with lazy loading
 */

import { BaseProvider } from './BaseProvider';
import { ProviderConfig, ProviderType, RetryConfig } from './types';

// Provider implementations
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { OpenRouterProvider } from './providers/OpenRouterProvider';
import { RequestyProvider } from './providers/RequestyProvider';
import { CustomProvider } from './providers/CustomProvider';

// Provider cache for lazy loading
const providerCache = new Map<string, BaseProvider>();

// Environment variable mapping for default providers
const ENV_KEY_MAP: Record<ProviderType, string> = {
  'openai': 'OPENAI_API_KEY',
  'anthropic': 'ANTHROPIC_API_KEY',
  'google_gemini': 'GOOGLE_GEMINI_API_KEY',
  'open_router': 'OPENROUTER_API_KEY',
  'requesty': 'REQUESTY_API_KEY',
  'custom': 'CUSTOM_AI_API_KEY'
};

// Default base URLs for providers
const DEFAULT_BASE_URLS: Record<ProviderType, string | undefined> = {
  'openai': undefined,
  'anthropic': undefined,
  'google_gemini': undefined,
  'open_router': undefined,
  'requesty': undefined,
  'custom': process.env.CUSTOM_AI_BASE_URL
};

/**
 * Create a provider instance
 */
export function createProvider(
  providerType: ProviderType,
  config: ProviderConfig,
  retryConfig?: RetryConfig
): BaseProvider {
  const cacheKey = `${providerType}:${config.apiKey?.slice(-8) || 'no-key'}`;

  // Check cache first
  const cached = providerCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let provider: BaseProvider;

  switch (providerType) {
    case 'openai':
      provider = new OpenAIProvider(config);
      break;

    case 'anthropic':
      provider = new AnthropicProvider(config);
      break;

    case 'google_gemini':
      provider = new GeminiProvider(config);
      break;

    case 'open_router':
      provider = new OpenRouterProvider(config);
      break;

    case 'requesty':
      provider = new RequestyProvider(config);
      break;

    case 'custom':
      provider = new CustomProvider(config);
      break;

    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }

  // Cache the provider
  providerCache.set(cacheKey, provider);

  return provider;
}

/**
 * Create a provider from environment variables
 */
export function createProviderFromEnv(
  providerType: ProviderType,
  retryConfig?: RetryConfig
): BaseProvider | null {
  const envKey = ENV_KEY_MAP[providerType];
  const apiKey = process.env[envKey];

  if (!apiKey || apiKey === `your-${providerType}-api-key`) {
    return null;
  }

  const config: ProviderConfig = {
    apiKey,
    baseUrl: DEFAULT_BASE_URLS[providerType]
  };

  return createProvider(providerType, config, retryConfig);
}

/**
 * Get the first available provider from environment
 */
export function getFirstAvailableProvider(): BaseProvider | null {
  const providerTypes: ProviderType[] = [
    'openai',
    'anthropic',
    'google_gemini',
    'open_router',
    'requesty'
  ];

  for (const providerType of providerTypes) {
    const provider = createProviderFromEnv(providerType);
    if (provider && provider.isConfigured()) {
      console.log(`[AIServiceFactory] Using ${providerType} provider from environment`);
      return provider;
    }
  }

  return null;
}

/**
 * Check if any AI provider is available
 */
export function isAnyProviderAvailable(): boolean {
  return getFirstAvailableProvider() !== null;
}

/**
 * Get available provider types from environment
 */
export function getAvailableProviderTypes(): ProviderType[] {
  const available: ProviderType[] = [];

  for (const [providerType, envKey] of Object.entries(ENV_KEY_MAP)) {
    const apiKey = process.env[envKey];
    if (apiKey && apiKey !== `your-${providerType}-api-key`) {
      available.push(providerType as ProviderType);
    }
  }

  return available;
}

/**
 * Clear the provider cache
 */
export function clearProviderCache(): void {
  providerCache.clear();
}

/**
 * Remove a specific provider from cache
 */
export function removeProviderFromCache(providerType: ProviderType, apiKeySuffix: string): void {
  const cacheKey = `${providerType}:${apiKeySuffix}`;
  providerCache.delete(cacheKey);
}

// Export types and classes
export * from './types';
export { BaseProvider } from './BaseProvider';
export { OpenAIProvider } from './providers/OpenAIProvider';
export { AnthropicProvider } from './providers/AnthropicProvider';
export { GeminiProvider } from './providers/GeminiProvider';
export { OpenRouterProvider } from './providers/OpenRouterProvider';
export { RequestyProvider } from './providers/RequestyProvider';
export { CustomProvider } from './providers/CustomProvider';
