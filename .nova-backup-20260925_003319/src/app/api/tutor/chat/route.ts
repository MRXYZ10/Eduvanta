import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { streamWithRetry } from "@/services/ai/factory";
import { AiProviderError } from "@/services/ai/types";
import {
  buildStudentLearningContext,
  formatContextForPrompt,
} from "@/services/ai/buildStudentLearningContext";
import {
  retrieveRelevantChunks,
  formatRetrievedMaterial,
} from "@/services/rag/retrieveRelevantChunks";
import { enforceRateLimit } from "@/services/security/enforceRateLimit";

const RequestSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(4000),
  currentTopicId: z.string().optional(),
  examMode: z.boolean().optional().default(false),
});

const NOVA_SYSTEM_PROMPT = `You are Nova, the AI tutor inside EduVanta AI.

You understand this student's learning state and should tailor responses when relevant.

You can explain concepts simply, teach with examples, quiz the student,
generate practice, explain mistakes, build study plans, and help revise weak topics.

Keep responses clear, structured, concrete, and concise.

IMPORTANT RESPONSE FORMATTING RULES:

1. Use normal Markdown headings:
### Heading

2. Put every heading on its own line.

3. Use normal Markdown bullets:
- Point one
- Point two

4. Use bold text normally:
**Important**

5. For INLINE mathematics, ALWAYS use single dollar signs:
$x^2 + y^2$

6. For DISPLAY mathematics, ALWAYS use double dollar signs:

$$
x_{n+1} = x_n - J(x_n)^{-1}F(x_n)
$$

7. NEVER use \\( ... \\) for mathematics.

8. NEVER use \\[ ... \\] for mathematics.

9. NEVER use square brackets [ ... ] as mathematics delimiters.

10. NEVER write raw LaTeX commands outside a math block.

11. Commands such as \\frac, \\partial, \\begin{pmatrix}, \\end{pmatrix},
\\sum and \\int MUST be inside $...$ or $$...$$.

12. Every display equation must have a blank line before and after it.

13. NEVER put Markdown headings, bullets, or normal prose inside $$ ... $$.

14. For matrices, ALWAYS use:

$$
J =
\\begin{pmatrix}
2x & 2y \\\\
e^x & 1
\\end{pmatrix}
$$

15. Keep mathematical expressions separate from normal prose.

16. Do not put the entire answer inside one math block.

17. Do not output incomplete or unclosed math delimiters.

18. Do not use raw LaTeX as plain text.

Keep the answer structured, readable, and student-friendly.

If REFERENCE MATERIAL is provided, prefer it when relevant and cite the
file name when you use it. Never invent citations, page numbers, or quotes.`;

const SIMPLE_SYSTEM_PROMPT = `You are Nova, a friendly AI tutor inside EduVanta AI.
Reply naturally and briefly to simple greetings or casual messages.
Do not over-explain.`;

function isSimpleMessage(message: string): boolean {
  return /^(hi|hello|hey|hii|hiii|yo|good morning|good afternoon|good evening|thanks|thank you|ok|okay|cool|nice|bye)$/i.test(
    message.trim(),
  );
}

function encodeSse(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const limited = enforceRateLimit(user.id, "aiChat");
  if (limited) return limited;

  const parsed = RequestSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const {
    conversationId,
    message,
    currentTopicId,
    examMode,
  } = parsed.data;

  const simple = isSimpleMessage(message);

  let conversation = conversationId
    ? await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId: user.id,
        },
      })
    : null;

  if (conversationId && !conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
      },
    });
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: message,
    },
  });

  let history: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [];

  let contextBlock = "";
  let materialBlock = "";

  if (!simple) {
    const historyPromise = prisma.message.findMany({
      where: {
        conversationId: conversation.id,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 10,
    });

    const contextPromise = buildStudentLearningContext(user.id, {
      currentTopicId,
    });

    const ragPromise =
      currentTopicId
        ? retrieveRelevantChunks(message, {
            topicId: currentTopicId,
            uploaderId: user.id,
          }).catch(() => [])
        : Promise.resolve([]);

    const [historyRows, context, chunks] = await Promise.all([
      historyPromise,
      contextPromise,
      ragPromise,
    ]);

    history = historyRows.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    if (context) {
      contextBlock = formatContextForPrompt(context);
    }

    if (chunks.length > 0) {
      materialBlock = formatRetrievedMaterial(chunks) ?? "";
    }
  }

  const systemPrompt = simple
    ? SIMPLE_SYSTEM_PROMPT
    : [
        NOVA_SYSTEM_PROMPT,
        examMode
          ? `EXAM MODE: Give an exam-focused answer. Prioritize clear steps, key formulas, important points, and concise marking-oriented explanations. When solving a problem, show the method and final answer clearly.`
          : null,
        contextBlock ? `STUDENT CONTEXT:\n${contextBlock}` : null,
        materialBlock ? `REFERENCE MATERIAL:\n${materialBlock}` : null,
      ]
        .filter(Boolean)
        .join("\n\n");

  const aiRequest = {
    tier: "standard" as const,
    messages: [
      {
        role: "system" as const,
        content: systemPrompt,
      },
      ...history,
      {
        role: "user" as const,
        content: message,
      },
    ],
    maxTokens: simple ? 64 : 768,
  };

  const encoder = new TextEncoder();
  let fullResponse = "";
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const safeEnqueue = (data: unknown) => {
        if (closed) return false;

        try {
          controller.enqueue(encodeSse(data));
          return true;
        } catch {
          closed = true;
          return false;
        }
      };

      try {
        safeEnqueue({
          type: "start",
          conversationId: conversation.id,
        });

        const aiStart = Date.now();
        let firstChunkAt: number | null = null;

        for await (const chunk of streamWithRetry(aiRequest)) {
          if (closed) break;

          if (firstChunkAt === null) {
            firstChunkAt = Date.now();

            if (process.env.NODE_ENV !== "production") {
              console.log("[NOVA PERF] first Gemini chunk:", firstChunkAt - aiStart, "ms");
            }
          }

          fullResponse += chunk;

          if (
            !safeEnqueue({
              type: "chunk",
              content: chunk,
            })
          ) {
            break;
          }
        }

        if (process.env.NODE_ENV !== "production") {
          console.log("[NOVA PERF] total Gemini stream:", Date.now() - aiStart, "ms");
        }

        if (closed) return;

        const saved = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "assistant",
            content: fullResponse,
          },
        });

        if (!safeEnqueue({
          type: "done",
          conversationId: conversation.id,
          message: {
            id: saved.id,
            role: "assistant",
            content: fullResponse,
          },
        })) {
          return;
        }

        closed = true;

        try {
          controller.close();
        } catch {
          // Stream was already closed.
        }
      } catch (err) {
        console.error("[NOVA STREAM ERROR]", err);

        if (closed) return;

        const retryable =
          err instanceof AiProviderError
            ? err.retryable
            : true;

        if (
          safeEnqueue({
            type: "error",
            error: "Nova couldn't connect right now.",
            retryable,
          })
        ) {
          closed = true;

          try {
            controller.close();
          } catch {
            // Stream was already closed.
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}





