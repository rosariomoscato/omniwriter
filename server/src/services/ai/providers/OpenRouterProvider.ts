/**
 * OpenRouter Provider Implementation
 * OpenRouter is a multi-model aggregator with OpenAI-compatible API
 * Supports access to many LLMs through a single API
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

// OpenRouter uses OpenAI-compatible response format
interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message?: {
      role: string;
      content: string;
    };
    delta?: {
      content?: string;
    };
    finish_reason: string | null;
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterModelsResponse {
  data: Array<{
    id: string;
    name: string;
    description?: string;
    context_length?: number;
    pricing?: {
      prompt: string;
      completion: string;
    };
  }>;
}

export class OpenRouterProvider extends BaseProvider {
  private static readonly PROVIDER_TYPE = 'open_router';
  private static readonly DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';
  private static readonly MODELS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private modelsCache: { models: ModelInfo[]; timestamp: number } | null = null;

  constructor(config: ProviderConfig) {
    super(config, OpenRouterProvider.PROVIDER_TYPE);
  }

  protected getDefaultBaseUrl(): string {
    return 'https://openrouter.ai/api/v1';
  }

  protected getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
      'X-Title': process.env.OPENROUTER_SITE_NAME || 'OmniWriter'
    };

    return headers;
  }

  protected mapError(error: unknown): AIError {
    if (error instanceof AIError) {
      return error;
    }

    const err = error as { status?: number; message?: string; error?: { code?: number; message?: string } };
    const message = err.error?.message || err.message || 'Unknown OpenRouter error';
    const status = err.status || err.error?.code;

    if (status === 401) {
      return new AIError('authentication_error', 'Invalid API key', this.providerType, error);
    }
    if (status === 402 || status === 429) {
      return new AIError('rate_limit_error', message, this.providerType, error);
    }
    if (status === 400) {
      if (message.includes('context') || message.includes('token')) {
        return new AIError('context_length_exceeded', message, this.providerType, error);
      }
      return new AIError('invalid_request_error', message, this.providerType, error);
    }
    if (status === 404) {
      return new AIError('model_not_found_error', 'Model not found', this.providerType, error);
    }
    if (message.includes('timeout')) {
      return new AIError('timeout_error', message, this.providerType, error);
    }
    if (message.includes('network') || message.includes('ECONNREFUSED')) {
      return new AIError('network_error', message, this.providerType, error);
    }

    return new AIError('unknown_error', message, this.providerType, error);
  }

  async chat(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResponse> {
    // Feature #281: Log messages structure for debugging
    console.log('[OpenRouter] chat() called with messages type:', typeof messages, 'isArray:', Array.isArray(messages));
    if (Array.isArray(messages)) {
      console.log('[OpenRouter] messages count:', messages.length);
    } else if (messages && typeof messages === 'object') {
      console.log('[OpenRouter] messages keys:', Object.keys(messages));
    }

    return this.withRetry(async () => {
      const body = this.buildRequestBody(messages, { ...options, stream: false });

      const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
        throw { status: response.status, message: errorData.error?.message || response.statusText, error: errorData.error };
      }

      const data = await response.json() as OpenRouterResponse;
      return this.parseResponse(data);
    }, 'chat');
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<CompletionResponse> {
    return this.chat([{ role: 'user', content: prompt }], options);
  }

  // Feature #393: Check if model is a "reasoning" model that needs longer idle timeout
  private isReasoningModel(model: string): boolean {
    const reasoningPatterns = [
      /gpt-5/i,
      /o1-/i,
      /o3-/i,
      /claude.*thinking/i,
      /claude.*extended/i,
      /deepseek.*reasoning/i,
      /reasoning/i
    ];
    return reasoningPatterns.some(pattern => pattern.test(model));
  }

  async *stream(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): AsyncGenerator<StreamEvent> {
    // Feature #281: Log messages structure for debugging
    console.log('[OpenRouter] stream() called with messages type:', typeof messages, 'isArray:', Array.isArray(messages));
    if (Array.isArray(messages)) {
      console.log('[OpenRouter] stream messages count:', messages.length);
    } else if (messages && typeof messages === 'object') {
      console.log('[OpenRouter] stream messages keys:', Object.keys(messages));
    }

    const body = this.buildRequestBody(messages, { ...options, stream: true });
    const model = options?.model || this.getDefaultModel();

    // Feature #393: Increase idle timeout for "reasoning" models (GPT 5.x, Claude thinking, etc.)
    // These models can take up to 3 minutes to produce the first token
    const isReasoning = this.isReasoningModel(model);
    const defaultIdleTimeout = isReasoning ? 180 * 1000 : BaseProvider.DEFAULT_IDLE_TIMEOUT_MS; // 180s for reasoning, 60s default

    // Feature #273: Get timeout settings from options or use defaults
    const timeoutMs = options?.timeoutMs || BaseProvider.DEFAULT_TIMEOUT_MS;
    const idleTimeoutMs = options?.idleTimeoutMs || defaultIdleTimeout;

    // Feature #393: Log model info and timeout settings
    console.log(`[OpenRouter] Model: ${model}, isReasoning: ${isReasoning}, idleTimeout: ${idleTimeoutMs}ms`);

    let retries = 0;
    const maxRetries = this.retryConfig.maxRetries;
    let delay = this.retryConfig.initialDelayMs;

    while (true) {
      // Feature #273: Create AbortController with timeout for each request attempt
      const { controller: timeoutController, cleanup: timeoutCleanup } = this.createTimeoutController(timeoutMs);

      // Feature #273: Track if stream is stalled
      let streamStalled = false;

      // Feature #393: Track timing for waiting events
      const streamStartTime = Date.now();
      let lastWaitingEventTime = 0;
      const waitingEventInterval = 10000; // Send waiting event every 10 seconds

      try {
        // Feature #393: Detailed logging before fetch
        console.log(`[OpenRouter] Starting fetch to ${this.getBaseUrl()}/chat/completions`);
        console.log(`[OpenRouter] Request body model: ${body.model}, stream: true`);
        console.log(`[OpenRouter] Timeout settings: total=${timeoutMs}ms, idle=${idleTimeoutMs}ms`);

        const fetchStartTime = Date.now();
        const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify(body),
          signal: timeoutController.signal  // Feature #273: Add abort signal
        });

        // Feature #393: Log fetch completion time
        console.log(`[OpenRouter] Fetch completed in ${Date.now() - fetchStartTime}ms, status: ${response.status}`);

        if (!response.ok) {
          timeoutCleanup();
          const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
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

        // Feature #393: Log successful connection
        console.log('[OpenRouter] Response body stream connected, sending start event');

        yield { type: 'start' };

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let totalContent = '';
        let usage: TokenUsage | undefined;
        let firstDeltaReceived = false; // Feature #393: Track first delta
        let chunkCount = 0; // Feature #393: Count chunks for debugging

        // Feature #273: Create watchdog to detect stalled streams
        const watchdog = this.createStreamWatchdog(idleTimeoutMs, () => {
          streamStalled = true;
          console.warn(`[OpenRouter] Stream stalled - no data for ${idleTimeoutMs}ms, aborting`);
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

            // Feature #393: Send "waiting" event periodically if no delta received yet
            if (!firstDeltaReceived) {
              const now = Date.now();
              const elapsed = now - streamStartTime;
              if (now - lastWaitingEventTime >= waitingEventInterval) {
                lastWaitingEventTime = now;
                console.log(`[OpenRouter] Sending waiting event, elapsed: ${elapsed}ms`);
                yield {
                  type: 'waiting',
                  waitingReason: isReasoning ? 'Model is reasoning (this may take a while for thinking models)' : 'Waiting for model response...',
                  elapsedTime: elapsed
                };
              }
            }

            const { done, value } = await reader.read();

            if (done) {
              // Feature #393: Log stream completion
              console.log(`[OpenRouter] Stream done, total chunks: ${chunkCount}, total content length: ${totalContent.length}`);
              break;
            }

            // Feature #393: Log raw chunk received and reset watchdog
            chunkCount++;
            if (chunkCount <= 5 || chunkCount % 50 === 0) {
              // Log first 5 chunks and then every 50th chunk
              console.log(`[OpenRouter] Chunk #${chunkCount} received, size: ${value?.length || 0} bytes`);
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

              if (data === '[DONE]') {
                // Feature #393: Log stream done event
                console.log(`[OpenRouter] Received [DONE] event after ${chunkCount} chunks`);
                watchdog.cleanup();
                timeoutCleanup();
                yield { type: 'done', content: totalContent, usage };
                return;
              }

              try {
                const parsed = JSON.parse(data) as OpenRouterResponse;
                const delta = parsed.choices[0]?.delta?.content;

                if (delta) {
                  // Feature #393: Log first delta received
                  if (!firstDeltaReceived) {
                    firstDeltaReceived = true;
                    console.log(`[OpenRouter] First delta received after ${Date.now() - streamStartTime}ms`);
                  }
                  totalContent += delta;
                  yield { type: 'delta', content: delta };
                }

                if (parsed.usage) {
                  usage = {
                    promptTokens: parsed.usage.prompt_tokens,
                    completionTokens: parsed.usage.completion_tokens,
                    totalTokens: parsed.usage.total_tokens
                  };
                }
              } catch (parseError) {
                // Feature #393: Log parse errors for debugging
                console.warn('[OpenRouter] Failed to parse SSE data:', data.substring(0, 100), parseError);
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

        // Feature #393: Detailed error logging
        console.error('[OpenRouter] Stream error:', error);
        if (error instanceof Error) {
          console.error(`[OpenRouter] Error name: ${error.name}, message: ${error.message}`);
        }

        // Feature #273: Check for abort/timeout errors
        if (this.isAbortError(error) || streamStalled) {
          const timeoutMsg = streamStalled
            ? `Stream stalled - no data for ${idleTimeoutMs / 1000} seconds`
            : `Request timeout after ${timeoutMs / 1000} seconds`;

          console.warn(`[OpenRouter] ${timeoutMsg}`);

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
    // Approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    try {
      const models = await this.getAvailableModels();
      return models.find(m => m.id === modelId) || null;
    } catch {
      return null;
    }
  }

  async testConnection(): Promise<ProviderStatus> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/models`, {
        headers: this.getHeaders()
      });

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
    if (this.modelsCache && Date.now() - this.modelsCache.timestamp < OpenRouterProvider.MODELS_CACHE_TTL) {
      return this.modelsCache.models;
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/models`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        return this.getDefaultModels();
      }

      const data = await response.json() as OpenRouterModelsResponse;

      const models: ModelInfo[] = data.data.map(m => ({
        id: m.id,
        name: m.name || m.id,
        provider: 'open_router',
        contextWindow: m.context_length,
        description: m.description,
        pricing: m.pricing ? {
          inputPerMillion: parseFloat(m.pricing.prompt) * 1000000,
          outputPerMillion: parseFloat(m.pricing.completion) * 1000000
        } : undefined
      }));

      // Sort by name
      const sortedModels = models.sort((a, b) => a.name.localeCompare(b.name));

      // Cache results
      this.modelsCache = { models: sortedModels, timestamp: Date.now() };

      return sortedModels;
    } catch {
      return this.getDefaultModels();
    }
  }

  private getDefaultModels(): ModelInfo[] {
    // Return some popular models as fallback
    return [
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet (via OpenRouter)',
        provider: 'open_router',
        features: ['fast', 'intelligent']
      },
      {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus (via OpenRouter)',
        provider: 'open_router',
        features: ['creative', 'nuanced']
      },
      {
        id: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo (via OpenRouter)',
        provider: 'open_router',
        features: ['fast', 'creative']
      },
      {
        id: 'google/gemini-pro-1.5',
        name: 'Gemini 1.5 Pro (via OpenRouter)',
        provider: 'open_router',
        features: ['long-context', 'multimodal']
      },
      {
        id: 'meta-llama/llama-3-70b-instruct',
        name: 'Llama 3 70B (via OpenRouter)',
        provider: 'open_router',
        features: ['open-source', 'large']
      }
    ];
  }

  getDefaultModel(): string {
    // Feature #389: Use configured default model if available
    return this.config.defaultModel || OpenRouterProvider.DEFAULT_MODEL;
  }

  protected buildRequestBody(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Record<string, unknown> {
    const model = options?.model || this.getDefaultModel();

    // Feature #281: Defensive check for messages array
    // Ensure messages is always an array to prevent 'messages.map is not a function' error
    let safeMessages: ChatMessage[] = [];
    if (Array.isArray(messages)) {
      safeMessages = messages;
    } else if (messages && typeof messages === 'object') {
      // Handle case where messages might be wrapped in an object
      const msgObj = messages as unknown as { messages?: ChatMessage[] };
      if (Array.isArray(msgObj.messages)) {
        console.warn('[OpenRouter] messages was wrapped in object, extracting inner array');
        safeMessages = msgObj.messages;
      } else {
        console.error('[OpenRouter] messages is an object but has no messages array:', typeof messages, messages);
      }
    } else {
      console.error('[OpenRouter] messages is not an array:', typeof messages, messages);
    }

    const body: Record<string, unknown> = {
      model,
      messages: safeMessages.map(m => ({
        role: m.role,
        content: m.content
      })),
      stream: options?.stream || false
    };

    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }
    if (options?.maxTokens !== undefined) {
      body.max_tokens = options.maxTokens;
    }
    if (options?.topP !== undefined) {
      body.top_p = options.topP;
    }
    if (options?.stopSequences && options.stopSequences.length > 0) {
      body.stop = options.stopSequences;
    }

    return body;
  }

  protected parseResponse(response: unknown): CompletionResponse {
    const data = response as OpenRouterResponse;
    const choice = data.choices[0];

    if (!choice) {
      throw new AIError('invalid_request_error', 'No choices in response', this.providerType);
    }

    const result: CompletionResponse = {
      content: choice.message?.content || '',
      model: data.model,
      finishReason: choice.finish_reason || undefined
    };

    if (data.usage) {
      result.usage = {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      };
    }

    return result;
  }
}
