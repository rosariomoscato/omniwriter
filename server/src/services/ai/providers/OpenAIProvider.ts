/**
 * OpenAI Provider Implementation
 * Supports GPT-4, GPT-3.5, and other OpenAI models with streaming
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

// OpenAI API response types
interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message?: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIModelsResponse {
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
}

export class OpenAIProvider extends BaseProvider {
  private static readonly PROVIDER_TYPE = 'openai';
  private static readonly DEFAULT_MODEL = 'gpt-4o-mini';
  private static readonly MODELS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private modelsCache: { models: ModelInfo[]; timestamp: number } | null = null;

  // Known OpenAI models with their capabilities
  private static readonly KNOWN_MODELS: ModelInfo[] = [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      contextWindow: 128000,
      maxOutputTokens: 4096,
      features: ['fast', 'multimodal', 'function_calling']
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      contextWindow: 128000,
      maxOutputTokens: 16384,
      features: ['fast', 'efficient', 'function_calling']
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      contextWindow: 128000,
      maxOutputTokens: 4096,
      features: ['fast', 'creative', 'analytical']
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      contextWindow: 8192,
      maxOutputTokens: 4096,
      features: ['creative', 'analytical', 'detailed']
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      contextWindow: 16385,
      maxOutputTokens: 4096,
      features: ['fast', 'efficient']
    },
    {
      id: 'o1-preview',
      name: 'O1 Preview',
      provider: 'openai',
      contextWindow: 128000,
      maxOutputTokens: 32768,
      features: ['reasoning', 'advanced']
    },
    {
      id: 'o1-mini',
      name: 'O1 Mini',
      provider: 'openai',
      contextWindow: 128000,
      maxOutputTokens: 65536,
      features: ['reasoning', 'fast']
    }
  ];

  constructor(config: ProviderConfig) {
    super(config, OpenAIProvider.PROVIDER_TYPE);
  }

  protected getDefaultBaseUrl(): string {
    return 'https://api.openai.com/v1';
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

    const err = error as { status?: number; message?: string; error?: { type?: string } };
    const message = err.message || 'Unknown OpenAI error';
    const status = err.status;

    // Map HTTP status codes to error types
    if (status === 401) {
      return new AIError('authentication_error', 'Invalid API key', this.providerType, error);
    }
    if (status === 429) {
      return new AIError('rate_limit_error', 'Rate limit exceeded', this.providerType, error);
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
    if (status === 422) {
      return new AIError('content_filter_error', message, this.providerType, error);
    }

    // Check for specific error types
    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      return new AIError('timeout_error', message, this.providerType, error);
    }
    if (message.includes('network') || message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
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
        throw { status: response.status, message: errorData.error?.message || response.statusText };
      }

      const data = await response.json() as OpenAIResponse;
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
          headers: this.getHeaders(),
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const error = this.mapError({ status: response.status, message: response.statusText });

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
              const parsed = JSON.parse(data) as OpenAIResponse;
              const delta = parsed.choices[0]?.delta?.content;

              if (delta) {
                totalContent += delta;
                yield { type: 'delta', content: delta };
              }

              // Check for usage in final chunk (if available)
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
    // Simple approximation: ~4 characters per token for English
    // For more accurate counting, tiktoken would be needed
    return Math.ceil(text.length / 4);
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    // First check known models
    const known = OpenAIProvider.KNOWN_MODELS.find(m => m.id === modelId);
    if (known) {
      return known;
    }

    // Try to fetch from API
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
    if (this.modelsCache && Date.now() - this.modelsCache.timestamp < OpenAIProvider.MODELS_CACHE_TTL) {
      return this.modelsCache.models;
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/models`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        // Return known models on error
        return OpenAIProvider.KNOWN_MODELS;
      }

      const data = await response.json() as OpenAIModelsResponse;

      // Filter to only include chat models
      const chatModels = data.data
        .filter(m =>
          m.id.startsWith('gpt') ||
          m.id.startsWith('o1') ||
          m.id.startsWith('o3') ||
          m.id.startsWith('chatgpt')
        )
        .map(m => {
          const known = OpenAIProvider.KNOWN_MODELS.find(k => k.id === m.id);
          return known || {
            id: m.id,
            name: m.id.toUpperCase().replace(/-/g, ' '),
            provider: 'openai' as const
          };
        });

      // Sort by name
      const sortedModels = chatModels.sort((a, b) => a.name.localeCompare(b.name));

      // Cache results
      this.modelsCache = { models: sortedModels, timestamp: Date.now() };

      return sortedModels;
    } catch {
      // Return known models on error
      return OpenAIProvider.KNOWN_MODELS;
    }
  }

  getDefaultModel(): string {
    return OpenAIProvider.DEFAULT_MODEL;
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
    if (options?.frequencyPenalty !== undefined) {
      body.frequency_penalty = options.frequencyPenalty;
    }
    if (options?.presencePenalty !== undefined) {
      body.presence_penalty = options.presencePenalty;
    }
    if (options?.stopSequences && options.stopSequences.length > 0) {
      body.stop = options.stopSequences;
    }

    return body;
  }

  protected parseResponse(response: unknown): CompletionResponse {
    const data = response as OpenAIResponse;
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
