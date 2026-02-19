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

  // Feature #273: Default timeout settings
  protected static readonly DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;     // 5 minutes total timeout
  protected static readonly DEFAULT_IDLE_TIMEOUT_MS = 60 * 1000;   // 60 seconds idle timeout

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
   * Feature #273: Create AbortController with timeout
   * @param timeoutMs Total timeout in milliseconds (0 = no timeout)
   * @returns AbortController and cleanup function
   */
  protected createTimeoutController(timeoutMs: number = 0): { controller: AbortController; cleanup: () => void } {
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        controller.abort(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    }

    return {
      controller,
      cleanup: () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };
  }

  /**
   * Feature #273: Create watchdog timer for detecting stalled streams
   * @param idleTimeoutMs Max time without data before aborting (default: 60 seconds)
   * @param onTimeout Callback when timeout fires
   * @returns Object with reset and cleanup functions
   */
  protected createStreamWatchdog(
    idleTimeoutMs: number = BaseProvider.DEFAULT_IDLE_TIMEOUT_MS,
    onTimeout: () => void
  ): { reset: () => void; cleanup: () => void } {
    let watchdogId: NodeJS.Timeout | null = null;

    const startWatchdog = () => {
      if (watchdogId) {
        clearTimeout(watchdogId);
      }
      watchdogId = setTimeout(() => {
        console.warn(`[${this.providerType}] Stream watchdog triggered - no data for ${idleTimeoutMs}ms`);
        onTimeout();
      }, idleTimeoutMs);
    };

    startWatchdog(); // Start initially

    return {
      reset: () => {
        startWatchdog(); // Reset the timer
      },
      cleanup: () => {
        if (watchdogId) {
          clearTimeout(watchdogId);
          watchdogId = null;
        }
      }
    };
  }

  /**
   * Feature #273: Check if an error is a timeout/abort error
   */
  protected isAbortError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.name === 'AbortError' ||
             error.message.includes('abort') ||
             error.message.includes('timeout');
    }
    return false;
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
