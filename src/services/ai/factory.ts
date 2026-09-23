import type { AiProvider, AiCompletionRequest, AiCompletionResponse } from "./types";
import { AiProviderError } from "./types";
import { AnthropicProvider } from "./providers/anthropic";
import { OpenAiProvider } from "./providers/openai";
import { GeminiProvider } from "./providers/gemini";
import { GroqProvider } from "./providers/groq";
import { MockAiProvider } from "./providers/mock";
import { logAiCall } from "@/services/observability/logger";

/**
 * This is the ONLY place in the codebase that knows which concrete AI
 * providers exist. Everything else (Nova tutor, question generation,
 * mistake analysis, study planner) imports getAiProvider() and talks
 * to the AiProvider interface only.
 *
 * Provider selection: AI_PROVIDER env var
 * ("anthropic" | "openai" | "gemini" | "groq").
 */
function buildProvider(): AiProvider {
  const selected = process.env.AI_PROVIDER ?? "anthropic";

  const keyFor = (name: string) =>
    ({
      anthropic: process.env.ANTHROPIC_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      gemini: process.env.GEMINI_API_KEY,
      groq: process.env.GROQ_API_KEY,
    })[name];

  const key = keyFor(selected);

  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `AI provider "${selected}" selected but no API key configured. ` +
          `Set ${selected.toUpperCase()}_API_KEY in your environment.`,
      );
    }
    return new MockAiProvider();
  }

  switch (selected) {
    case "openai":
      return new OpenAiProvider(key);
    case "gemini":
      return new GeminiProvider(key);
    case "groq":
      return new GroqProvider(key);
    case "anthropic":
    default:
      return new AnthropicProvider(key);
  }
}

let cachedProvider: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (!cachedProvider) cachedProvider = buildProvider();
  return cachedProvider;
}

/**
 * Embeddings are resolved independently of the chat provider.
 * RAG currently uses OpenAI embeddings.
 */
let cachedEmbeddingProvider: AiProvider | null = null;

export function getEmbeddingProvider(): AiProvider {
  if (cachedEmbeddingProvider) return cachedEmbeddingProvider;

  if (process.env.OPENAI_API_KEY) {
    cachedEmbeddingProvider = new OpenAiProvider(process.env.OPENAI_API_KEY);
    return cachedEmbeddingProvider;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "RAG embeddings require OPENAI_API_KEY to be set, even when AI_PROVIDER is anthropic, gemini, or groq.",
    );
  }

  cachedEmbeddingProvider = new MockAiProvider();
  return cachedEmbeddingProvider;
}

/**
 * Cost control + resilience wrapper.
 */
export async function* streamWithRetry(
  req: AiCompletionRequest,
  opts: { retries?: number } = {},
): AsyncGenerator<string, void, unknown> {
  const provider = getAiProvider();

  if (!provider.stream) {
    throw new AiProviderError(
      `AI provider "${provider.name}" does not support streaming.`,
      provider.name,
      false,
    );
  }

  const retries = opts.retries ?? 1;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      yield* provider.stream(req);
      return;
    } catch (err) {
      lastError = err;

      const retryable =
        err instanceof AiProviderError ? err.retryable : true;

      if (!retryable || attempt === retries) {
        break;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 400 * (attempt + 1)),
      );
    }
  }

  throw lastError;
}

export async function completeWithRetry(
  req: AiCompletionRequest,
  opts: { retries?: number } = {},
): Promise<AiCompletionResponse> {
  const provider = getAiProvider();
  const retries = opts.retries ?? 1;
  const startedAt = Date.now();

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await provider.complete(req);

      logAiCall({
        provider: response.provider,
        model: response.model,
        durationMs: Date.now() - startedAt,
        success: true,
      });

      return response;
    } catch (err) {
      lastError = err;

      const retryable =
        err instanceof AiProviderError ? err.retryable : true;

      if (!retryable || attempt === retries) {
        logAiCall({
          provider: provider.name,
          durationMs: Date.now() - startedAt,
          success: false,
          errorMessage: err instanceof Error ? err.message : String(err),
          retryable,
        });
        break;
      }

      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }

  throw lastError;
}
