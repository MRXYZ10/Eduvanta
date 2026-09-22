import type { AiProvider, AiCompletionRequest, AiCompletionResponse, AiEmbeddingRequest, AiEmbeddingResponse } from "../types";

/**
 * MOCK PROVIDER — used only when no real AI provider key is configured.
 *
 * This exists so the app runs and is demoable without secrets, per the
 * project's rule against faking functionality: every response is clearly
 * labeled `mock: true` in metadata, and this file must never be reached in
 * a production build with real keys configured (see factory.ts, which
 * throws in production if it would fall back here).
 */
export class MockAiProvider implements AiProvider {
  name = "mock";

  async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const lastUser = [...req.messages].reverse().find((m) => m.role === "user")?.content ?? "";

    let content: string;
    if (req.jsonMode) {
      // Return a structurally valid placeholder so callers relying on
      // jsonMode don't crash — server-side validation will still catch
      // and flag that this came from the mock provider.
      content = JSON.stringify({
        mock: true,
        note: "MockAiProvider: configure a real AI_PROVIDER key to get live responses.",
        receivedPromptPreview: lastUser.slice(0, 120),
      });
    } else {
      content = `[Mock AI response] No AI provider is configured yet, so this is a placeholder. ` +
        `You said: "${lastUser.slice(0, 200)}". Configure OPENAI_API_KEY, GEMINI_API_KEY, or ` +
        `ANTHROPIC_API_KEY (and set AI_PROVIDER) in your environment to get real responses.`;
    }

    return { content, provider: this.name, model: "mock-v1" };
  }

  async embed(req: AiEmbeddingRequest): Promise<AiEmbeddingResponse> {
    // Deterministic pseudo-embedding (hash-based) purely so RAG code paths
    // are exercisable in dev without a real embedding provider. NOT semantically
    // meaningful — never use for anything beyond local plumbing tests.
    const dim = 32;
    const vec = new Array(dim).fill(0);
    for (let i = 0; i < req.input.length; i++) {
      vec[i % dim] += req.input.charCodeAt(i);
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return {
      embedding: vec.map((v) => v / norm),
      provider: this.name,
      model: "mock-embed-v1",
    };
  }
}
