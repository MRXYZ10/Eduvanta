import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiProvider,
} from "../types";
import { AiProviderError } from "../types";

const MODELS = {
  fast: "openai/gpt-oss-20b",
  standard: "openai/gpt-oss-120b",
  reasoning: "openai/gpt-oss-120b",
} as const;

const VISION_MODEL = "qwen/qwen3.8-27b";

function buildGroqMessages(req: AiCompletionRequest) {
  const imageUrls = (req.imageDataUrls ?? [])
    .filter((value): value is string =>
      typeof value === "string" &&
      value.startsWith("data:image/")
    )
    .slice(0, 3);

  if (imageUrls.length === 0) {
    return req.messages;
  }

  const messages = req.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role !== "user") continue;

    const text =
      typeof messages[i].content === "string"
        ? messages[i].content
        : String(messages[i].content ?? "");

    messages[i] = {
      role: "user",
      content: [
        {
          type: "text",
          text,
        },
        ...imageUrls.map((url) => ({
          type: "image_url",
          image_url: { url },
        })),
      ],
    } as unknown as typeof messages[number];

    break;
  }

  return messages;
}
export class GroqProvider implements AiProvider {
  name = "groq";

  constructor(private readonly apiKey: string) {}

  private getModel(tier?: AiCompletionRequest["tier"]) {
    return MODELS[tier ?? "standard"];
  }

  async complete(
    req: AiCompletionRequest,
  ): Promise<AiCompletionResponse> {
    const model = req.imageDataUrls?.length ? VISION_MODEL : this.getModel(req.tier);
    const messages = buildGroqMessages(req);

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: req.temperature ?? 0.2,
          max_tokens: req.maxTokens ?? 2048,
          ...(req.jsonMode
            ? { response_format: { type: "json_object" } }
            : {}),
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();

      throw new AiProviderError(
        `Groq API error ${response.status}: ${text}`,
        "groq",
        response.status === 429 || response.status >= 500,
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? "";

    return {
      content,
      provider: "groq",
      model,
      usage: data?.usage
        ? {
            inputTokens: data.usage.prompt_tokens ?? 0,
            outputTokens: data.usage.completion_tokens ?? 0,
          }
        : undefined,
    };
  }

  async *stream(
    req: AiCompletionRequest,
  ): AsyncGenerator<string, void, unknown> {
    const model = req.imageDataUrls?.length ? VISION_MODEL : this.getModel(req.tier);
    const messages = buildGroqMessages(req);

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: req.temperature ?? 0.2,
          max_tokens: req.maxTokens ?? 2048,
          stream: true,
          ...(req.jsonMode
            ? { response_format: { type: "json_object" } }
            : {}),
        }),
      },
    );

    if (!response.ok || !response.body) {
      const text = await response.text();

      throw new AiProviderError(
        `Groq streaming error ${response.status}: ${text}`,
        "groq",
        response.status === 429 || response.status >= 500,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice(5).trim();

        if (payload === "[DONE]") return;

        try {
          const data = JSON.parse(payload);
          const token = data?.choices?.[0]?.delta?.content;

          if (token) {
            yield token;
          }
        } catch {
          // Ignore incomplete SSE chunks.
        }
      }
    }
  }
}


