/**
 * Anthropic Provider Implementation
 * Supports Claude 3 family (Opus, Sonnet, Haiku) and Claude 2 models
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

// Anthropic API response types
interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicStreamEvent {
  type: string;
  message?: AnthropicResponse;
  delta?: {
    type: string;
    text?: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicProvider extends BaseProvider {
  private static readonly PROVIDER_TYPE = 'anthropic';
  private static readonly DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
  private static readonly API_VERSION = '2023-06-01';

  // Known Anthropic models with their capabilities
  private static readonly KNOWN_MODELS: ModelInfo[] = [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      features: ['fast', 'intelligent', 'multimodal', 'artifacts']
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      features: ['fast', 'efficient']
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 4096,
      features: ['creative', 'nuanced', 'long-context']
    },
    {
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 4096,
      features: ['balanced', 'intelligent']
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 4096,
      features: ['fast', 'efficient']
    },
    {
      id: 'claude-2.1',
      name: 'Claude 2.1',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 4096,
      features: ['legacy', 'long-context']
    },
    {
      id: 'claude-2.0',
      name: 'Claude 2.0',
      provider: 'anthropic',
      contextWindow: 100000,
      maxOutputTokens: 4096,
      features: ['legacy']
    },
    {
      id: 'claude-instant-1.2',
      name: 'Claude Instant 1.2',
      provider: 'anthropic',
      contextWindow: 100000,
      maxOutputTokens: 4096,
      features: ['fast', 'efficient', 'legacy']
    }
  ];

  constructor(config: ProviderConfig) {
    super(config, AnthropicProvider.PROVIDER_TYPE);
  }

  protected getDefaultBaseUrl(): string {
    return 'https://api.anthropic.com/v1';
  }

  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'anthropic-version': AnthropicProvider.API_VERSION
    };
  }

  protected mapError(error: unknown): AIError {
    if (error instanceof AIError) {
      return error;
    }

    const err = error as { status?: number; message?: string; error?: { type?: string; message?: string } };
    const message = err.error?.message || err.message || 'Unknown Anthropic error';
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
      if (message.includes('max_tokens') || message.includes('too long')) {
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

      const response = await fetch(`${this.getBaseUrl()}/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: { type?: string; message?: string } };
        throw { status: response.status, message: errorData.error?.message || response.statusText, error: errorData.error };
      }

      const data = await response.json() as AnthropicResponse;
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
        const response = await fetch(`${this.getBaseUrl()}/messages`, {
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

            try {
              const event = JSON.parse(data) as AnthropicStreamEvent;

              if (event.type === 'content_block_delta' && event.delta?.text) {
                totalContent += event.delta.text;
                yield { type: 'delta', content: event.delta.text };
              }

              if (event.type === 'message_delta' && event.usage) {
                usage = {
                  promptTokens: event.usage.input_tokens,
                  completionTokens: event.usage.output_tokens,
                  totalTokens: event.usage.input_tokens + event.usage.output_tokens
                };
              }

              if (event.type === 'message_start' && event.message?.usage) {
                usage = {
                  promptTokens: event.message.usage.input_tokens,
                  completionTokens: event.message.usage.output_tokens,
                  totalTokens: event.message.usage.input_tokens + event.message.usage.output_tokens
                };
              }

              if (event.type === 'message_stop') {
                yield { type: 'done', content: totalContent, usage };
                return;
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
    return AnthropicProvider.KNOWN_MODELS.find(m => m.id === modelId) || null;
  }

  async testConnection(): Promise<ProviderStatus> {
    try {
      // Anthropic doesn't have a models endpoint, so we test with a minimal message
      const response = await fetch(`${this.getBaseUrl()}/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: AnthropicProvider.DEFAULT_MODEL,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      });

      // 400 is acceptable - it means auth works but minimal request failed
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
    // Anthropic doesn't have a models API endpoint, return known models
    return AnthropicProvider.KNOWN_MODELS;
  }

  getDefaultModel(): string {
    return AnthropicProvider.DEFAULT_MODEL;
  }

  protected buildRequestBody(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Record<string, unknown> {
    const model = options?.model || this.getDefaultModel();

    // Extract system message from messages array
    let systemPrompt: string | undefined;
    const chatMessages = messages.filter(m => {
      if (m.role === 'system') {
        systemPrompt = m.content;
        return false;
      }
      return true;
    });

    const body: Record<string, unknown> = {
      model,
      messages: chatMessages.map(m => ({
        role: m.role,
        content: m.content
      })),
      max_tokens: options?.maxTokens || 4096,
      stream: options?.stream || false
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }
    if (options?.topP !== undefined) {
      body.top_p = options.topP;
    }
    if (options?.stopSequences && options.stopSequences.length > 0) {
      body.stop_sequences = options.stopSequences;
    }

    return body;
  }

  protected parseResponse(response: unknown): CompletionResponse {
    const data = response as AnthropicResponse;

    // Extract text from content blocks
    const content = data.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    const result: CompletionResponse = {
      content,
      model: data.model,
      finishReason: data.stop_reason || undefined
    };

    if (data.usage) {
      result.usage = {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      };
    }

    return result;
  }
}
