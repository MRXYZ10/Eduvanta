// Provider-agnostic contract. Every feature (Nova tutor, question generation,
// mistake analysis, study planning) talks to this interface only Ã¢â‚¬â€ never to
// OpenAI/Gemini/Anthropic SDKs directly. That's what makes swapping providers
// a config change instead of a rewrite.

export type AiRole = "system" | "user" | "assistant";

export interface AiMessage {
  role: AiRole;
  content: string;
}

export interface AiCompletionRequest {
  messages: AiMessage[];
  /** Hint for model tier, not a specific model name Ã¢â‚¬â€ the provider maps this. */
  tier?: "fast" | "standard" | "reasoning";
  maxTokens?: number;
  temperature?: number;
  /** If set, provider must return valid JSON matching this shape's intent.
   *  Callers still validate server-side Ã¢â‚¬â€ see services/ai/validate.ts. */
  jsonMode?: boolean;
}

export interface AiCompletionResponse {
  content: string;
  provider: string;
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface AiEmbeddingRequest {
  input: string;
}

export interface AiEmbeddingResponse {
  embedding: number[];
  provider: string;
  model: string;
}

export interface AiProvider {
  name: string;
  complete(req: AiCompletionRequest): Promise<AiCompletionResponse>;
  stream?(req: AiCompletionRequest): AsyncGenerator<string, void, unknown>;
  embed?(req: AiEmbeddingRequest): Promise<AiEmbeddingResponse>;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

