/**
 * Common TypeScript interfaces for the AI Service
 */

// Supported provider types
export type ProviderType = 'openai' | 'anthropic' | 'google_gemini' | 'open_router' | 'requesty' | 'custom';

// Message role types
export type MessageRole = 'system' | 'user' | 'assistant';

// Single chat message
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

// Completion options
export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  stream?: boolean;
  // Feature #273: Timeout configuration for streaming
  timeoutMs?: number;          // Overall request timeout (default: 5 minutes)
  idleTimeoutMs?: number;      // Max time without receiving data (default: 60 seconds)
}

// Model information
export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderType;
  contextWindow?: number;
  maxOutputTokens?: number;
  features?: string[];
  pricing?: {
    inputPerMillion?: number;
    outputPerMillion?: number;
  };
}

// Streaming event types
export type StreamEventType = 'start' | 'delta' | 'done' | 'error';

// Stream event
export interface StreamEvent {
  type: StreamEventType;
  content?: string;
  error?: string;
  usage?: TokenUsage;
}

// Token usage statistics
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Completion response
export interface CompletionResponse {
  content: string;
  model: string;
  usage?: TokenUsage;
  finishReason?: string;
}

// Provider configuration
export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  additionalConfig?: Record<string, unknown>;
}

// Provider status
export interface ProviderStatus {
  available: boolean;
  lastChecked?: Date;
  error?: string;
}

// Error types for unified error handling
export type AIErrorType =
  | 'authentication_error'
  | 'rate_limit_error'
  | 'invalid_request_error'
  | 'model_not_found_error'
  | 'context_length_exceeded'
  | 'content_filter_error'
  | 'timeout_error'
  | 'network_error'
  | 'unknown_error';

// Unified AI error
export class AIError extends Error {
  public readonly type: AIErrorType;
  public readonly provider: ProviderType;
  public readonly originalError?: unknown;
  public readonly retryable: boolean;

  constructor(
    type: AIErrorType,
    message: string,
    provider: ProviderType,
    originalError?: unknown
  ) {
    super(message);
    this.name = 'AIError';
    this.type = type;
    this.provider = provider;
    this.originalError = originalError;
    this.retryable = this.isRetryable(type);
  }

  private isRetryable(type: AIErrorType): boolean {
    return ['rate_limit_error', 'timeout_error', 'network_error'].includes(type);
  }
}

// Retry configuration
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// Default retry configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2
};

// Style analysis result (for Human Model feature)
export interface StyleAnalysisResult {
  tone: string;
  sentence_structure: string;
  vocabulary: string;
  patterns: string[];
}
