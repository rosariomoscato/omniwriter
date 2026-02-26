/**
 * Google Gemini Provider Implementation
 * Supports Gemini 1.5 Pro, Gemini 1.5 Flash, and Gemini Pro models
 */

import { BaseProvider } from '../BaseProvider';
import {
  ChatMessage,
  CompletionOptions,
  CompletionResponse,
  ModelInfo,
  ProviderConfig,
  ProviderStatus,
  AIError,
  StreamEvent,
  TokenUsage
} from '../types';

// Gemini API response types
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text?: string;
      }>;
      role: string;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GeminiModelsResponse {
  models: Array<{
    name: string;
    displayName?: string;
    inputTokenLimit?: number;
    outputTokenLimit?: number;
  }>;
}

export class GeminiProvider extends BaseProvider {
  private static readonly PROVIDER_TYPE = 'google_gemini';
  private static readonly DEFAULT_MODEL = 'gemini-1.5-flash';
  private static readonly MODELS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private modelsCache: { models: ModelInfo[]; timestamp: number } | null = null;

  // Known Gemini models with their capabilities
  private static readonly KNOWN_MODELS: ModelInfo[] = [
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'google_gemini',
      contextWindow: 2097152, // 2M tokens
      maxOutputTokens: 8192,
      features: ['long-context', 'multimodal', 'reasoning']
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: 'google_gemini',
      contextWindow: 1048576, // 1M tokens
      maxOutputTokens: 8192,
      features: ['fast', 'multimodal', 'efficient']
    },
    {
      id: 'gemini-1.5-flash-8b',
      name: 'Gemini 1.5 Flash-8B',
      provider: 'google_gemini',
      contextWindow: 1048576,
      maxOutputTokens: 8192,
      features: ['fast', 'efficient', 'small']
    },
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      provider: 'google_gemini',
      contextWindow: 32768,
      maxOutputTokens: 2048,
      features: ['legacy', 'balanced']
    },
    {
      id: 'gemini-pro-vision',
      name: 'Gemini Pro Vision',
      provider: 'google_gemini',
      contextWindow: 16384,
      maxOutputTokens: 2048,
      features: ['legacy', 'multimodal']
    }
  ];

  constructor(config: ProviderConfig) {
    super(config, GeminiProvider.PROVIDER_TYPE);
  }

  protected getDefaultBaseUrl(): string {
    return 'https://generativelanguage.googleapis.com/v1';
  }

  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json'
    };
  }

  protected mapError(error: unknown): AIError {
    if (error instanceof AIError) {
      return error;
    }

    const err = error as { status?: number; message?: string; error?: { code?: number; message?: string; status?: string } };
    const message = err.error?.message || err.message || 'Unknown Gemini error';
    const code = err.error?.code || err.status;
    const status = err.error?.status;

    // Map error codes and status
    if (code === 401 || code === 403 || status === 'UNAUTHENTICATED') {
      return new AIError('authentication_error', 'Invalid API key', this.providerType, error);
    }
    if (code === 429 || status === 'RESOURCE_EXHAUSTED') {
      return new AIError('rate_limit_error', 'Rate limit exceeded', this.providerType, error);
    }
    if (code === 400 || status === 'INVALID_ARGUMENT') {
      if (message.includes('token') || message.includes('length')) {
        return new AIError('context_length_exceeded', message, this.providerType, error);
      }
      return new AIError('invalid_request_error', message, this.providerType, error);
    }
    if (code === 404 || status === 'NOT_FOUND') {
      return new AIError('model_not_found_error', 'Model not found', this.providerType, error);
    }
    if (status === 'SAFETY' || message.includes('safety')) {
      return new AIError('content_filter_error', message, this.providerType, error);
    }
    if (message.includes('timeout') || status === 'DEADLINE_EXCEEDED') {
      return new AIError('timeout_error', message, this.providerType, error);
    }
    if (status === 'UNAVAILABLE' || message.includes('network') || message.includes('ECONNREFUSED')) {
      return new AIError('network_error', message, this.providerType, error);
    }

    return new AIError('unknown_error', message, this.providerType, error);
  }

  async chat(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResponse> {
    return this.withRetry(async () => {
      const model = options?.model || this.getDefaultModel();
      const body = this.buildRequestBody(messages, options);

      const response = await fetch(
        `${this.getBaseUrl()}/models/${model}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: { code?: number; message?: string; status?: string } };
        throw { status: response.status, message: errorData.error?.message || response.statusText, error: errorData.error };
      }

      const data = await response.json() as GeminiResponse;
      return this.parseResponse(data);
    }, 'chat');
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<CompletionResponse> {
    return this.chat([{ role: 'user', content: prompt }], options);
  }

  async *stream(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): AsyncGenerator<StreamEvent> {
    const model = options?.model || this.getDefaultModel();
    const body = this.buildRequestBody(messages, options);

    // Feature #273: Get timeout settings from options or use defaults
    const timeoutMs = options?.timeoutMs || BaseProvider.DEFAULT_TIMEOUT_MS;
    const idleTimeoutMs = options?.idleTimeoutMs || BaseProvider.DEFAULT_IDLE_TIMEOUT_MS;

    let retries = 0;
    const maxRetries = this.retryConfig.maxRetries;
    let delay = this.retryConfig.initialDelayMs;

    while (true) {
      // Feature #273: Create AbortController with timeout for each request attempt
      const { controller: timeoutController, cleanup: timeoutCleanup } = this.createTimeoutController(timeoutMs);

      // Feature #273: Track if stream is stalled
      let streamStalled = false;

      try {
        console.log(`[Gemini] Starting stream with timeout=${timeoutMs}ms, idleTimeout=${idleTimeoutMs}ms`);

        const response = await fetch(
          `${this.getBaseUrl()}/models/${model}:streamGenerateContent?key=${this.config.apiKey}&alt=sse`,
          {
            method: 'POST',
            headers: {
              ...this.getHeaders(),
              'Accept': 'text/event-stream'
            },
            body: JSON.stringify(body),
            signal: timeoutController.signal  // Feature #273: Add abort signal
          }
        );

        if (!response.ok) {
          timeoutCleanup();
          const errorData = await response.json().catch(() => ({})) as { error?: { code?: number; message?: string; status?: string } };
          const error = this.mapError({ status: response.status, message: errorData.error?.message, error: errorData.error });

          if (error.retryable && retries < maxRetries) {
            yield { type: 'error', error: `Retrying (${retries + 1}/${maxRetries}): ${error.message}` };
            await this.sleep(delay);
            delay = Math.min(delay * this.retryConfig.backoffMultiplier, this.retryConfig.maxDelayMs);
            retries++;
            continue;
          }

          yield { type: 'error', error: error.message };
          return;
        }

        if (!response.body) {
          timeoutCleanup();
          yield { type: 'error', error: 'No response body' };
          return;
        }

        yield { type: 'start' };

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let totalContent = '';
        let usage: TokenUsage | undefined;

        // Feature #273: Create watchdog to detect stalled streams
        const watchdog = this.createStreamWatchdog(idleTimeoutMs, () => {
          streamStalled = true;
          console.warn(`[Gemini] Stream stalled - no data for ${idleTimeoutMs}ms, aborting`);
          reader.cancel().catch(() => {});  // Cancel the reader
          timeoutController.abort(new Error(`Stream stalled - no data for ${idleTimeoutMs}ms`));
        });

        try {
          while (true) {
            // Feature #273: Check if stream was stalled by watchdog
            if (streamStalled) {
              yield { type: 'error', error: `Stream stalled - no data received for ${idleTimeoutMs / 1000} seconds` };
              return;
            }

            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            // Feature #273: Reset watchdog on each successful read
            watchdog.reset();

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();

              if (!trimmed || !trimmed.startsWith('data: ')) {
                continue;
              }

              const data = trimmed.slice(6);

              try {
                const parsed = JSON.parse(data) as GeminiResponse;

                if (parsed.candidates && parsed.candidates.length > 0) {
                  const text = parsed.candidates[0].content.parts
                    .filter(p => p.text)
                    .map(p => p.text)
                    .join('');

                  if (text) {
                    totalContent += text;
                    yield { type: 'delta', content: text };
                  }
                }

                if (parsed.usageMetadata) {
                  usage = {
                    promptTokens: parsed.usageMetadata.promptTokenCount,
                    completionTokens: parsed.usageMetadata.candidatesTokenCount,
                    totalTokens: parsed.usageMetadata.totalTokenCount
                  };
                }
              } catch {
                // Skip malformed JSON chunks
              }
            }
          }
        } finally {
          watchdog.cleanup();
          timeoutCleanup();
        }

        yield { type: 'done', content: totalContent, usage };
        return;
      } catch (error) {
        timeoutCleanup();

        // Feature #273: Check for abort/timeout errors
        if (this.isAbortError(error) || streamStalled) {
          const timeoutMsg = streamStalled
            ? `Stream stalled - no data for ${idleTimeoutMs / 1000} seconds`
            : `Request timeout after ${timeoutMs / 1000} seconds`;

          console.warn(`[Gemini] ${timeoutMsg}`);

          if (retries < maxRetries) {
            yield { type: 'error', error: `Timeout, retrying (${retries + 1}/${maxRetries}): ${timeoutMsg}` };
            await this.sleep(delay);
            delay = Math.min(delay * this.retryConfig.backoffMultiplier, this.retryConfig.maxDelayMs);
            retries++;
            continue;
          }

          yield { type: 'error', error: timeoutMsg };
          return;
        }

        const aiError = this.mapError(error);

        if (aiError.retryable && retries < maxRetries) {
          yield { type: 'error', error: `Retrying (${retries + 1}/${maxRetries}): ${aiError.message}` };
          await this.sleep(delay);
          delay = Math.min(delay * this.retryConfig.backoffMultiplier, this.retryConfig.maxDelayMs);
          retries++;
          continue;
        }

        yield { type: 'error', error: aiError.message };
        return;
      }
    }
  }

  async countTokens(text: string): Promise<number> {
    // Approximation: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    const known = GeminiProvider.KNOWN_MODELS.find(m => m.id === modelId);
    if (known) {
      return known;
    }

    try {
      const models = await this.getAvailableModels();
      return models.find(m => m.id === modelId) || null;
    } catch {
      return null;
    }
  }

  async testConnection(): Promise<ProviderStatus> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/models/gemini-pro:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hi' }] }]
          })
        }
      );

      if (response.ok) {
        return { available: true, lastChecked: new Date() };
      }

      const error = this.mapError({ status: response.status, message: response.statusText });
      return { available: false, lastChecked: new Date(), error: error.message };
    } catch (error) {
      const aiError = this.mapError(error);
      return { available: false, lastChecked: new Date(), error: aiError.message };
    }
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    // Check cache
    if (this.modelsCache && Date.now() - this.modelsCache.timestamp < GeminiProvider.MODELS_CACHE_TTL) {
      return this.modelsCache.models;
    }

    try {
      const response = await fetch(
        `${this.getBaseUrl()}/models?key=${this.config.apiKey}`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        return GeminiProvider.KNOWN_MODELS;
      }

      const data = await response.json() as GeminiModelsResponse;

      // Filter to only include Gemini models
      const geminiModels = data.models
        .filter(m => m.name.includes('gemini'))
        .map(m => {
          const modelId = m.name.replace('models/', '');
          const known = GeminiProvider.KNOWN_MODELS.find(k => k.id === modelId);
          return known || {
            id: modelId,
            name: m.displayName || modelId,
            provider: 'google_gemini' as const,
            contextWindow: m.inputTokenLimit,
            maxOutputTokens: m.outputTokenLimit
          };
        });

      // Sort by name
      const sortedModels = geminiModels.sort((a, b) => a.name.localeCompare(b.name));

      // Cache results
      this.modelsCache = { models: sortedModels, timestamp: Date.now() };

      return sortedModels;
    } catch {
      return GeminiProvider.KNOWN_MODELS;
    }
  }

  getDefaultModel(): string {
    // Feature #389: Use configured default model if available
    return this.config.defaultModel || GeminiProvider.DEFAULT_MODEL;
  }

  protected buildRequestBody(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Record<string, unknown> {
    // Convert messages to Gemini format
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }]
    }));

    const body: Record<string, unknown> = {
      contents
    };

    // Add generation config
    const generationConfig: Record<string, unknown> = {};

    if (options?.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }
    if (options?.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = options.maxTokens;
    }
    if (options?.topP !== undefined) {
      generationConfig.topP = options.topP;
    }
    if (options?.stopSequences && options.stopSequences.length > 0) {
      generationConfig.stopSequences = options.stopSequences;
    }

    if (Object.keys(generationConfig).length > 0) {
      body.generationConfig = generationConfig;
    }

    return body;
  }

  protected parseResponse(response: unknown): CompletionResponse {
    const data = response as GeminiResponse;

    if (!data.candidates || data.candidates.length === 0) {
      throw new AIError('invalid_request_error', 'No candidates in response', this.providerType);
    }

    const candidate = data.candidates[0];
    const content = candidate.content.parts
      .filter(p => p.text)
      .map(p => p.text)
      .join('');

    const result: CompletionResponse = {
      content,
      model: '', // Model is in the request URL, not the response
      finishReason: candidate.finishReason
    };

    if (data.usageMetadata) {
      result.usage = {
        promptTokens: data.usageMetadata.promptTokenCount,
        completionTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount
      };
    }

    return result;
  }
}
