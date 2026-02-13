/**
 * Requesty Provider Implementation
 * Requesty is an LLM API aggregator that uses OpenAI-compatible API
 * Base URL: https://router.requesty.ai/v1
 * Uses Authorization: Bearer header and /chat/completions endpoint (OpenAI-style)
 *
 * Reference: https://docs.requesty.ai/quickstart
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

// Requesty uses OpenAI-compatible response format
interface RequestyResponse {
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

export class RequestyProvider extends BaseProvider {
  private static readonly PROVIDER_TYPE = 'requesty';
  // Default model uses exact Requesty model ID format: provider/model-id
  // See: https://docs.requesty.ai/api-reference/endpoint/messages-create
  private static readonly DEFAULT_MODEL = 'anthropic/claude-sonnet-4-20250514';

  // Known models available through Requesty router
  // Model IDs must follow Requesty format: provider/exact-model-id
  private static readonly KNOWN_MODELS: ModelInfo[] = [
    {
      id: 'anthropic/claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4 (via Requesty)',
      provider: 'requesty',
      contextWindow: 200000,
      maxOutputTokens: 16384,
      features: ['fast', 'intelligent', 'multimodal']
    },
    {
      id: 'anthropic/claude-3-7-sonnet',
      name: 'Claude 3.7 Sonnet (via Requesty)',
      provider: 'requesty',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      features: ['fast', 'intelligent', 'multimodal']
    },
    {
      id: 'anthropic/claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku (via Requesty)',
      provider: 'requesty',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      features: ['fast', 'efficient']
    },
    {
      id: 'openai/gpt-4o',
      name: 'GPT-4o (via Requesty)',
      provider: 'requesty',
      contextWindow: 128000,
      maxOutputTokens: 16384,
      features: ['fast', 'multimodal', 'intelligent']
    },
    {
      id: 'openai/gpt-4o-mini',
      name: 'GPT-4o Mini (via Requesty)',
      provider: 'requesty',
      contextWindow: 128000,
      maxOutputTokens: 16384,
      features: ['fast', 'efficient']
    },
    {
      id: 'google/gemini-2.0-flash-exp',
      name: 'Gemini 2.0 Flash (via Requesty)',
      provider: 'requesty',
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      features: ['fast', 'multimodal', 'long-context']
    },
    {
      id: 'mistral/mistral-large-2411',
      name: 'Mistral Large (via Requesty)',
      provider: 'requesty',
      contextWindow: 128000,
      maxOutputTokens: 8192,
      features: ['intelligent', 'multilingual']
    },
    {
      id: 'meta/llama-3.3-70b-instruct',
      name: 'Llama 3.3 70B (via Requesty)',
      provider: 'requesty',
      contextWindow: 128000,
      maxOutputTokens: 8192,
      features: ['open-source', 'intelligent']
    }
  ];

  constructor(config: ProviderConfig) {
    super(config, RequestyProvider.PROVIDER_TYPE);
  }

  protected getDefaultBaseUrl(): string {
    // OpenAI-compatible mode: base URL includes /v1
    return 'https://router.requesty.ai/v1';
  }

  protected getHeaders(): Record<string, string> {
    // OpenAI-compatible mode: uses Authorization: Bearer
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`
    };
  }

  protected mapError(error: unknown): AIError {
    if (error instanceof AIError) {
      return error;
    }

    const err = error as { status?: number; message?: string; error?: { type?: string; message?: string } };
    const message = err.error?.message || err.message || 'Unknown Requesty error';
    const errorType = err.error?.type;
    const status = err.status;

    // Map HTTP status codes and error types
    if (status === 401 || errorType === 'authentication_error') {
      return new AIError('authentication_error', 'Invalid API key', this.providerType, error);
    }
    if (status === 429 || errorType === 'rate_limit_error') {
      return new AIError('rate_limit_error', 'Rate limit exceeded', this.providerType, error);
    }
    if (status === 400 || errorType === 'invalid_request_error') {
      if (message.includes('max_tokens') || message.includes('too long') || message.includes('context')) {
        return new AIError('context_length_exceeded', message, this.providerType, error);
      }
      return new AIError('invalid_request_error', message, this.providerType, error);
    }
    if (status === 404 || errorType === 'model_not_found_error' || errorType === 'not_found_error') {
      return new AIError('model_not_found_error', 'Model not found', this.providerType, error);
    }
    if (errorType === 'content_filter_error' || message.includes('content_filter')) {
      return new AIError('content_filter_error', message, this.providerType, error);
    }
    if (errorType === 'timeout_error' || message.includes('timeout')) {
      return new AIError('timeout_error', message, this.providerType, error);
    }
    if (errorType === 'api_error' || message.includes('overloaded')) {
      return new AIError('rate_limit_error', message, this.providerType, error);
    }

    // Check for network errors
    if (message.includes('network') || message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
      return new AIError('network_error', message, this.providerType, error);
    }

    return new AIError('unknown_error', message, this.providerType, error);
  }

  async chat(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResponse> {
    return this.withRetry(async () => {
      const body = this.buildRequestBody(messages, { ...options, stream: false });

      // OpenAI-compatible endpoint
      const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: { type?: string; message?: string } };
        throw { status: response.status, message: errorData.error?.message || response.statusText, error: errorData.error };
      }

      const data = await response.json() as RequestyResponse;
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
    const body = this.buildRequestBody(messages, { ...options, stream: true });

    let retries = 0;
    const maxRetries = this.retryConfig.maxRetries;
    let delay = this.retryConfig.initialDelayMs;

    while (true) {
      try {
        // OpenAI-compatible endpoint
        const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})) as { error?: { type?: string; message?: string } };
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
          yield { type: 'error', error: 'No response body' };
          return;
        }

        yield { type: 'start' };

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let totalContent = '';
        let usage: TokenUsage | undefined;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

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
              yield { type: 'done', content: totalContent, usage };
              return;
            }

            try {
              const parsed = JSON.parse(data) as RequestyResponse;
              const delta = parsed.choices[0]?.delta?.content;

              if (delta) {
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
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }

        yield { type: 'done', content: totalContent, usage };
        return;
      } catch (error) {
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
    // Approximation: ~3.5 characters per token for English
    return Math.ceil(text.length / 3.5);
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    return RequestyProvider.KNOWN_MODELS.find(m => m.id === modelId) || null;
  }

  async testConnection(): Promise<ProviderStatus> {
    try {
      // Test with a minimal chat completion request (OpenAI-compatible)
      const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: RequestyProvider.DEFAULT_MODEL,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      });

      // 400 is acceptable - it means auth works but minimal request may have failed
      if (response.ok || response.status === 400) {
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
    // Requesty doesn't have a models API endpoint, return known models
    return RequestyProvider.KNOWN_MODELS;
  }

  getDefaultModel(): string {
    return RequestyProvider.DEFAULT_MODEL;
  }

  protected buildRequestBody(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Record<string, unknown> {
    const model = options?.model || this.getDefaultModel();

    // OpenAI-compatible request body (no system extraction - keeps system in messages array)
    const body: Record<string, unknown> = {
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      max_tokens: options?.maxTokens || 4096,
      stream: options?.stream || false
    };

    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
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
    const data = response as RequestyResponse;
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
