import type { AiProvider, AiCompletionRequest, AiCompletionResponse, AiEmbeddingRequest, AiEmbeddingResponse } from "../types";
import { AiProviderError } from "../types";

const TIER_TO_MODEL: Record<NonNullable<AiCompletionRequest["tier"]>, string> = {
  fast: "gpt-4o-mini",
  standard: "gpt-4o",
  reasoning: "o1",
};

export class OpenAiProvider implements AiProvider {
  name = "openai";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const model = TIER_TO_MODEL[req.tier ?? "standard"];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: req.maxTokens ?? 1024,
        temperature: req.temperature ?? 0.7,
        response_format: req.jsonMode ? { type: "json_object" } : undefined,
        messages: req.messages,
      }),
    });

    if (!res.ok) {
      const retryable = res.status === 429 || res.status >= 500;
      throw new AiProviderError(`OpenAI error ${res.status}`, this.name, retryable);
    }

    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content ?? "",
      provider: this.name,
      model,
      usage: data.usage
        ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
        : undefined,
    };
  }

  async embed(req: AiEmbeddingRequest): Promise<AiEmbeddingResponse> {
    const model = "text-embedding-3-small";
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model, input: req.input }),
    });

    if (!res.ok) {
      throw new AiProviderError(`OpenAI embedding error ${res.status}`, this.name, res.status >= 500);
    }

    const data = await res.json();
    return { embedding: data.data[0].embedding, provider: this.name, model };
  }
}
