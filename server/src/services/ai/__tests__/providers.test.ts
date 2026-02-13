/**
 * Unit tests for AI Service providers
 *
 * These tests verify the provider implementations without making actual API calls.
 * They test:
 * - Provider instantiation
 * - Request body building
 * - Response parsing
 * - Error mapping
 * - Token counting
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Types
import {
  ChatMessage,
  CompletionOptions,
  AIError,
  ProviderConfig
} from '../types';

// Providers
import { OpenAIProvider } from '../providers/OpenAIProvider';
import { AnthropicProvider } from '../providers/AnthropicProvider';
import { GeminiProvider } from '../providers/GeminiProvider';
import { OpenRouterProvider } from '../providers/OpenRouterProvider';
import { RequestyProvider } from '../providers/RequestyProvider';
import { CustomProvider } from '../providers/CustomProvider';

// Factory
import {
  createProvider,
  getAvailableProviderTypes,
  clearProviderCache
} from '../AIServiceFactory';

// Test configuration
const TEST_API_KEY = 'test-api-key-12345';
const TEST_BASE_URL = 'http://localhost:8080/v1';

describe('AI Service Types', () => {
  it('should define correct error types', () => {
    const error = new AIError(
      'authentication_error',
      'Invalid API key',
      'openai'
    );

    expect(error.type).toBe('authentication_error');
    expect(error.provider).toBe('openai');
    expect(error.retryable).toBe(false);
  });

  it('should identify retryable errors correctly', () => {
    const rateLimitError = new AIError(
      'rate_limit_error',
      'Rate limit exceeded',
      'anthropic'
    );
    expect(rateLimitError.retryable).toBe(true);

    const timeoutError = new AIError(
      'timeout_error',
      'Request timed out',
      'openai'
    );
    expect(timeoutError.retryable).toBe(true);

    const networkError = new AIError(
      'network_error',
      'Connection refused',
      'google_gemini'
    );
    expect(networkError.retryable).toBe(true);

    const authError = new AIError(
      'authentication_error',
      'Invalid key',
      'openai'
    );
    expect(authError.retryable).toBe(false);
  });
});

describe('OpenAI Provider', () => {
  let provider: OpenAIProvider;
  const config: ProviderConfig = { apiKey: TEST_API_KEY };

  beforeEach(() => {
    provider = new OpenAIProvider(config);
  });

  it('should be instantiated correctly', () => {
    expect(provider).toBeInstanceOf(OpenAIProvider);
    expect(provider.getProviderType()).toBe('openai');
    expect(provider.isConfigured()).toBe(true);
  });

  it('should return correct default model', () => {
    expect(provider.getDefaultModel()).toBe('gpt-4o-mini');
  });

  it('should return correct default base URL', () => {
    expect((provider as any).getDefaultBaseUrl()).toBe('https://api.openai.com/v1');
  });

  it('should build correct request body', () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hello!' }
    ];
    const options: CompletionOptions = {
      temperature: 0.7,
      maxTokens: 100
    };

    const body = (provider as any).buildRequestBody(messages, options);

    expect(body.model).toBe('gpt-4o-mini');
    expect(body.messages).toHaveLength(2);
    expect(body.temperature).toBe(0.7);
    expect(body.max_tokens).toBe(100);
    expect(body.stream).toBe(false);
  });

  it('should map errors correctly', () => {
    const authError = (provider as any).mapError({ status: 401, message: 'Unauthorized' });
    expect(authError.type).toBe('authentication_error');

    const rateLimitError = (provider as any).mapError({ status: 429, message: 'Too many requests' });
    expect(rateLimitError.type).toBe('rate_limit_error');

    const notFoundError = (provider as any).mapError({ status: 404, message: 'Not found' });
    expect(notFoundError.type).toBe('model_not_found_error');
  });

  it('should count tokens approximately', async () => {
    const tokenCount = await provider.countTokens('Hello, this is a test message!');
    expect(tokenCount).toBeGreaterThan(0);
    expect(typeof tokenCount).toBe('number');
  });

  it('should return known models', async () => {
    const models = await provider.getAvailableModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.some(m => m.id === 'gpt-4o')).toBe(true);
    expect(models.some(m => m.id === 'gpt-3.5-turbo')).toBe(true);
  });
});

describe('Anthropic Provider', () => {
  let provider: AnthropicProvider;
  const config: ProviderConfig = { apiKey: TEST_API_KEY };

  beforeEach(() => {
    provider = new AnthropicProvider(config);
  });

  it('should be instantiated correctly', () => {
    expect(provider).toBeInstanceOf(AnthropicProvider);
    expect(provider.getProviderType()).toBe('anthropic');
    expect(provider.isConfigured()).toBe(true);
  });

  it('should return correct default model', () => {
    expect(provider.getDefaultModel()).toBe('claude-3-5-sonnet-20241022');
  });

  it('should extract system message from messages array', () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'Hello!' }
    ];

    const body = (provider as any).buildRequestBody(messages, {});

    expect(body.system).toBe('System prompt');
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe('user');
  });

  it('should return known models', async () => {
    const models = await provider.getAvailableModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.some(m => m.id.includes('claude-3'))).toBe(true);
  });
});

describe('Gemini Provider', () => {
  let provider: GeminiProvider;
  const config: ProviderConfig = { apiKey: TEST_API_KEY };

  beforeEach(() => {
    provider = new GeminiProvider(config);
  });

  it('should be instantiated correctly', () => {
    expect(provider).toBeInstanceOf(GeminiProvider);
    expect(provider.getProviderType()).toBe('google_gemini');
    expect(provider.isConfigured()).toBe(true);
  });

  it('should return correct default model', () => {
    expect(provider.getDefaultModel()).toBe('gemini-1.5-flash');
  });

  it('should convert messages to Gemini format', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hello!' },
      { role: 'assistant', content: 'Hi there!' }
    ];

    const body = (provider as any).buildRequestBody(messages, {});

    expect(body.contents).toHaveLength(2);
    expect(body.contents[0].role).toBe('user');
    expect(body.contents[1].role).toBe('model'); // assistant -> model
  });
});

describe('OpenRouter Provider', () => {
  let provider: OpenRouterProvider;
  const config: ProviderConfig = { apiKey: TEST_API_KEY };

  beforeEach(() => {
    provider = new OpenRouterProvider(config);
  });

  it('should be instantiated correctly', () => {
    expect(provider).toBeInstanceOf(OpenRouterProvider);
    expect(provider.getProviderType()).toBe('open_router');
    expect(provider.isConfigured()).toBe(true);
  });

  it('should include required headers', () => {
    const headers = provider['getHeaders']();

    expect(headers['Authorization']).toBe(`Bearer ${TEST_API_KEY}`);
    expect(headers['HTTP-Referer']).toBeDefined();
    expect(headers['X-Title']).toBeDefined();
  });

  it('should return correct default model', () => {
    expect(provider.getDefaultModel()).toBe('anthropic/claude-3.5-sonnet');
  });
});

describe('Requesty Provider', () => {
  let provider: RequestyProvider;
  const config: ProviderConfig = { apiKey: TEST_API_KEY };

  beforeEach(() => {
    provider = new RequestyProvider(config);
  });

  it('should be instantiated correctly', () => {
    expect(provider).toBeInstanceOf(RequestyProvider);
    expect(provider.getProviderType()).toBe('requesty');
    expect(provider.isConfigured()).toBe(true);
  });

  it('should return correct default base URL (OpenAI-compatible mode)', () => {
    // OpenAI-compatible mode: base URL includes /v1
    expect((provider as any).getDefaultBaseUrl()).toBe('https://router.requesty.ai/v1');
  });

  it('should use Authorization: Bearer header (OpenAI-compatible)', () => {
    const headers = (provider as any).getHeaders();
    expect(headers['Authorization']).toBe(`Bearer ${TEST_API_KEY}`);
    expect(headers['x-api-key']).toBeUndefined();
  });

  it('should keep system message in messages array (OpenAI-style)', () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'Hello!' }
    ];

    const body = (provider as any).buildRequestBody(messages, {});

    // OpenAI-style: system message stays in messages array
    expect(body.system).toBeUndefined();
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toBe('System prompt');
  });

  it('should return correct default model', () => {
    // Default model uses exact Requesty model ID format
    expect(provider.getDefaultModel()).toBe('anthropic/claude-sonnet-4-20250514');
  });

  it('should return known models', async () => {
    const models = await provider.getAvailableModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.some(m => m.id.includes('claude'))).toBe(true);
    expect(models.some(m => m.id.includes('gpt'))).toBe(true);
    // Check that models use Requesty format (provider/model-id)
    expect(models.some(m => m.id === 'anthropic/claude-sonnet-4-20250514')).toBe(true);
    expect(models.some(m => m.id === 'openai/gpt-4o')).toBe(true);
  });

  it('should parse OpenAI-style response correctly', () => {
    // OpenAI-compatible response format
    const mockResponse = {
      id: 'chatcmpl-123',
      choices: [{
        message: { role: 'assistant', content: 'Hello from Requesty!' },
        finish_reason: 'stop'
      }],
      model: 'anthropic/claude-sonnet-4-20250514',
      usage: {
        prompt_tokens: 20,
        completion_tokens: 10,
        total_tokens: 30
      }
    };

    const result = (provider as any).parseResponse(mockResponse);

    expect(result.content).toBe('Hello from Requesty!');
    expect(result.model).toBe('anthropic/claude-sonnet-4-20250514');
    expect(result.finishReason).toBe('stop');
    expect(result.usage?.promptTokens).toBe(20);
    expect(result.usage?.completionTokens).toBe(10);
    expect(result.usage?.totalTokens).toBe(30);
  });
});

describe('Custom Provider', () => {
  it('should require base URL', () => {
    expect(() => {
      new CustomProvider({ apiKey: TEST_API_KEY });
    }).toThrow('Base URL is required');
  });

  it('should be instantiated correctly with base URL', () => {
    const provider = new CustomProvider({
      apiKey: TEST_API_KEY,
      baseUrl: TEST_BASE_URL
    });

    expect(provider).toBeInstanceOf(CustomProvider);
    expect(provider.getProviderType()).toBe('custom');
    expect(provider.isConfigured()).toBe(true);
  });

  it('should work without API key', () => {
    const provider = new CustomProvider({
      apiKey: '',
      baseUrl: TEST_BASE_URL
    });

    expect(provider.isConfigured()).toBe(false);
    const headers = provider['getHeaders']();
    expect(headers['Authorization']).toBeUndefined();
  });

  it('should include custom headers from additionalConfig', () => {
    const provider = new CustomProvider({
      apiKey: TEST_API_KEY,
      baseUrl: TEST_BASE_URL,
      additionalConfig: {
        headers: {
          'X-Custom-Header': 'custom-value'
        }
      }
    });

    const headers = provider['getHeaders']();
    expect(headers['X-Custom-Header']).toBe('custom-value');
  });
});

describe('AI Service Factory', () => {
  beforeEach(() => {
    clearProviderCache();
  });

  it('should create provider by type', () => {
    const openai = createProvider('openai', { apiKey: TEST_API_KEY });
    expect(openai.getProviderType()).toBe('openai');

    const anthropic = createProvider('anthropic', { apiKey: TEST_API_KEY });
    expect(anthropic.getProviderType()).toBe('anthropic');

    const gemini = createProvider('google_gemini', { apiKey: TEST_API_KEY });
    expect(gemini.getProviderType()).toBe('google_gemini');
  });

  it('should throw for invalid provider type', () => {
    expect(() => {
      createProvider('invalid' as any, { apiKey: TEST_API_KEY });
    }).toThrow('Unknown provider type');
  });

  it('should cache providers', () => {
    const p1 = createProvider('openai', { apiKey: TEST_API_KEY });
    const p2 = createProvider('openai', { apiKey: TEST_API_KEY });
    expect(p1).toBe(p2); // Same instance due to caching
  });
});

describe('Response Parsing', () => {
  it('should parse OpenAI response correctly', () => {
    const provider = new OpenAIProvider({ apiKey: TEST_API_KEY });

    const mockResponse = {
      id: 'chatcmpl-123',
      choices: [{
        message: { role: 'assistant', content: 'Hello, world!' },
        finish_reason: 'stop'
      }],
      model: 'gpt-4o-mini',
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    };

    const result = (provider as any).parseResponse(mockResponse);

    expect(result.content).toBe('Hello, world!');
    expect(result.model).toBe('gpt-4o-mini');
    expect(result.finishReason).toBe('stop');
    expect(result.usage?.promptTokens).toBe(10);
    expect(result.usage?.completionTokens).toBe(5);
  });

  it('should parse Anthropic response correctly', () => {
    const provider = new AnthropicProvider({ apiKey: TEST_API_KEY });

    const mockResponse = {
      id: 'msg-123',
      content: [
        { type: 'text', text: 'Hello from Claude!' }
      ],
      model: 'claude-3-5-sonnet',
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 20,
        output_tokens: 10
      }
    };

    const result = (provider as any).parseResponse(mockResponse);

    expect(result.content).toBe('Hello from Claude!');
    expect(result.model).toBe('claude-3-5-sonnet');
    expect(result.finishReason).toBe('end_turn');
    expect(result.usage?.promptTokens).toBe(20);
    expect(result.usage?.completionTokens).toBe(10);
  });

  it('should parse Gemini response correctly', () => {
    const provider = new GeminiProvider({ apiKey: TEST_API_KEY });

    const mockResponse = {
      candidates: [{
        content: {
          parts: [
            { text: 'Hello from Gemini!' }
          ],
          role: 'model'
        },
        finishReason: 'STOP'
      }],
      usageMetadata: {
        promptTokenCount: 15,
        candidatesTokenCount: 8,
        totalTokenCount: 23
      }
    };

    const result = (provider as any).parseResponse(mockResponse);

    expect(result.content).toBe('Hello from Gemini!');
    expect(result.finishReason).toBe('STOP');
    expect(result.usage?.promptTokens).toBe(15);
    expect(result.usage?.completionTokens).toBe(8);
    expect(result.usage?.totalTokens).toBe(23);
  });
});
