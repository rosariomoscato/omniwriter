/**
 * Requesty Provider Implementation
 * Requesty is an LLM API aggregator with OpenAI-compatible interface
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

interface RequestyModelsResponse {
  data: Array<{
    id: string;
    name?: string;
    description?: string;
    context_length?: number;
  }>;
}

export class RequestyProvider extends BaseProvider {
  private static readonly PROVIDER_TYPE = 'requesty';
  private static readonly DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';
  private static readonly MODELS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private modelsCache: { models: ModelInfo[]; timestamp: number } | null = null;

  constructor(config: ProviderConfig) {
    super(config, RequestyProvider.PROVIDER_TYPE);
  }

  protected getDefaultBaseUrl(): string {
    return 'https://api.requesty.ai/v1';
  }

  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`
    };
  }

  protected mapError(error: unknown): AIError {
    if (error instanceof AIError) {
      return error;
    }

    const err = error as { status?: number; message?: string; error?: { code?: number; message?: string } };
    const message = err.error?.message || err.message || 'Unknown Requesty error';
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
        const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
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
    if (this.modelsCache && Date.now() - this.modelsCache.timestamp < RequestyProvider.MODELS_CACHE_TTL) {
      return this.modelsCache.models;
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/models`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        return this.getDefaultModels();
      }

      const data = await response.json() as RequestyModelsResponse;

      const models: ModelInfo[] = data.data.map(m => ({
        id: m.id,
        name: m.name || m.id,
        provider: 'requesty',
        contextWindow: m.context_length,
        description: m.description
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
    // Return common models as fallback
    return [
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'requesty'
      },
      {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'requesty'
      },
      {
        id: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'requesty'
      },
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        provider: 'requesty'
      }
    ];
  }

  getDefaultModel(): string {
    return RequestyProvider.DEFAULT_MODEL;
  }

  protected buildRequestBody(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Record<string, unknown> {
    const model = options?.model || this.getDefaultModel();

    const body: Record<string, unknown> = {
      model,
      messages: messages.map(m => ({
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
