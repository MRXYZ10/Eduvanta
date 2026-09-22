import type { AiProvider, AiCompletionRequest, AiCompletionResponse } from "../types";
import { AiProviderError } from "../types";

const TIER_TO_MODEL: Record<NonNullable<AiCompletionRequest["tier"]>, string> = {
  fast: "gemini-3.1-flash-lite",
  standard: "gemini-3.1-flash-lite",
  reasoning: "gemini-3.1-flash-lite",
};

export class GeminiProvider implements AiProvider {
  name = "gemini";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const model = TIER_TO_MODEL[req.tier ?? "standard"];
    const system = req.messages.find((m) => m.role === "system")?.content;
    const rest = req.messages.filter((m) => m.role !== "system");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: rest.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          maxOutputTokens: req.maxTokens ?? 1024,
          temperature: req.temperature ?? 0.7,
        },
      }),
    });

    if (!res.ok) {
      const retryable = res.status === 429 || res.status >= 500;
      throw new AiProviderError(`Gemini error ${res.status}`, this.name, retryable);
    }

    const data = await res.json();
    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((p: { text: string }) => p.text)
        .join("\n") ?? "";

    return { content: text, provider: this.name, model };
  }

  async *stream(req: AiCompletionRequest): AsyncGenerator<string, void, unknown> {
    const model = TIER_TO_MODEL[req.tier ?? "standard"];
    const system = req.messages.find((m) => m.role === "system")?.content;
    const rest = req.messages.filter((m) => m.role !== "system");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: rest.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          maxOutputTokens: req.maxTokens ?? 1024,
          temperature: req.temperature ?? 0.7,
        },
      }),
    });

    if (!res.ok) {
      const retryable = res.status === 429 || res.status >= 500;
      throw new AiProviderError(`Gemini error ${res.status}`, this.name, retryable);
    }

    if (!res.body) {
      throw new AiProviderError("Gemini returned no stream", this.name, true);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();

          if (!trimmed.startsWith("data:")) continue;

          const jsonText = trimmed.slice(5).trim();

          if (!jsonText || jsonText === "[DONE]") continue;

          try {
            const data = JSON.parse(jsonText);

            const text =
              data.candidates?.[0]?.content?.parts
                ?.map((p: { text?: string }) => p.text ?? "")
                .join("") ?? "";

            if (text) {
              yield text;
            }
          } catch {
            // Ignore incomplete SSE JSON chunks.
          }
        }
      }

      buffer += decoder.decode();

      for (const line of buffer.split("\n")) {
        const trimmed = line.trim();

        if (!trimmed.startsWith("data:")) continue;

        const jsonText = trimmed.slice(5).trim();

        if (!jsonText || jsonText === "[DONE]") continue;

        try {
          const data = JSON.parse(jsonText);

          const text =
            data.candidates?.[0]?.content?.parts
              ?.map((p: { text?: string }) => p.text ?? "")
              .join("") ?? "";

          if (text) {
            yield text;
          }
        } catch {
          // Ignore malformed final SSE data.
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
