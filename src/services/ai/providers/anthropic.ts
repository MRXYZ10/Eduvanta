import type { AiProvider, AiCompletionRequest, AiCompletionResponse } from "../types";
import { AiProviderError } from "../types";

const TIER_TO_MODEL: Record<NonNullable<AiCompletionRequest["tier"]>, string> = {
  fast: "claude-haiku-4-5-20251001",
  standard: "claude-sonnet-5",
  reasoning: "claude-opus-5",
};

export class AnthropicProvider implements AiProvider {
  name = "anthropic";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const model = TIER_TO_MODEL[req.tier ?? "standard"];
    const system = req.messages.find((m) => m.role === "system")?.content;
    const rest = req.messages.filter((m) => m.role !== "system");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: req.maxTokens ?? 1024,
        temperature: req.temperature ?? 0.7,
        system,
        messages: rest.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) {
      const retryable = res.status === 429 || res.status >= 500;
      throw new AiProviderError(`Anthropic error ${res.status}`, this.name, retryable);
    }

    const data = await res.json();
    const text = data.content
      ?.filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n") ?? "";

    return {
      content: text,
      provider: this.name,
      model,
      usage: data.usage
        ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
        : undefined,
    };
  }
}
