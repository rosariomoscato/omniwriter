/**
 * Base Provider Abstract Class
 * All AI providers must implement this interface
 */

import {
  ChatMessage,
  CompletionOptions,
  CompletionResponse,
  ModelInfo,
  ProviderConfig,
  ProviderStatus,
  ProviderType,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  AIError,
  StreamEvent
} from './types';

export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected providerType: ProviderType;
  protected retryConfig: RetryConfig;

  constructor(config: ProviderConfig, providerType: ProviderType, retryConfig?: RetryConfig) {
    this.config = config;
    this.providerType = providerType;
    this.retryConfig = retryConfig || DEFAULT_RETRY_CONFIG;
  }

  /**
   * Get the provider type identifier
   */
  getProviderType(): ProviderType {
    return this.providerType;
  }

  /**
   * Execute an operation with retry logic and exponential backoff
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: AIError | undefined;
    let delay = this.retryConfig.initialDelayMs;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.mapError(error);

        // Don't retry if not retryable
        if (!lastError.retryable || attempt === this.retryConfig.maxRetries) {
          throw lastError;
        }

        console.warn(
          `[${this.providerType}] ${operationName} attempt ${attempt + 1} failed, ` +
          `retrying in ${delay}ms: ${lastError.message}`
        );

        await this.sleep(delay);
        delay = Math.min(delay * this.retryConfig.backoffMultiplier, this.retryConfig.maxDelayMs);
      }
    }

    throw lastError;
  }

  /**
   * Map provider-specific errors to unified AIError
   */
  protected abstract mapError(error: unknown): AIError;

  /**
   * Sleep utility for retry delays
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Chat completion with messages array
   */
  abstract chat(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResponse>;

  /**
   * Simple completion from a single prompt
   */
  abstract complete(prompt: string, options?: CompletionOptions): Promise<CompletionResponse>;

  /**
   * Streaming chat completion
   * Yields StreamEvent objects for SSE compatibility
   */
  abstract stream(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): AsyncGenerator<StreamEvent>;

  /**
   * Count tokens in text (provider-specific implementation)
   */
  abstract countTokens(text: string): Promise<number>;

  /**
   * Get information about a specific model
   */
  abstract getModelInfo(modelId: string): Promise<ModelInfo | null>;

  /**
   * Test the provider connection
   */
  abstract testConnection(): Promise<ProviderStatus>;

  /**
   * Get list of available models from this provider
   */
  abstract getAvailableModels(): Promise<ModelInfo[]>;

  /**
   * Get the default model for this provider
   */
  abstract getDefaultModel(): string;

  /**
   * Check if the provider is properly configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 0;
  }

  /**
   * Get headers for API requests
   */
  protected abstract getHeaders(): Record<string, string>;

  /**
   * Get the base URL for API requests
   */
  protected getBaseUrl(): string {
    return this.config.baseUrl || this.getDefaultBaseUrl();
  }

  /**
   * Get the default base URL for this provider
   */
  protected abstract getDefaultBaseUrl(): string;

  /**
   * Build the request body for completions
   */
  protected abstract buildRequestBody(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Record<string, unknown>;

  /**
   * Parse the response from the API
   */
  protected abstract parseResponse(response: unknown): CompletionResponse;
}
