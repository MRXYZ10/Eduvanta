import { NextResponse } from "next/server";
import { completeNovaWithQuota } from "@/services/ai/completeNovaWithQuota";

export const dynamic = "force-dynamic";

type HistoryItem = {
  role?: "user" | "assistant";
  content?: string;
};

function isValidImageDataUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;

  return /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=\r\n]+$/i.test(
    value,
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message =
      typeof body?.message === "string"
        ? body.message.trim()
        : "";

    const imageDataUrl = body?.imageDataUrl;

    if (!isValidImageDataUrl(imageDataUrl)) {
      return NextResponse.json(
        { error: "Please upload a valid PNG, JPG, or WebP image." },
        { status: 400 },
      );
    }

    // Keep the request bounded. Groq currently supports up to 20 MB
    // for image requests; we use a smaller app-level limit for stability.
    if (imageDataUrl.length > 15_000_000) {
      return NextResponse.json(
        { error: "Image is too large. Please use an image under 10 MB." },
        { status: 413 },
      );
    }

    const history: HistoryItem[] = Array.isArray(body?.history)
      ? body.history
          .filter(
            (item: HistoryItem) =>
              (item.role === "user" || item.role === "assistant") &&
              typeof item.content === "string",
          )
          .slice(-8)
      : [];

    const safeHistory = history.map((item) => ({
      role: item.role as "user" | "assistant",
      content: item.content as string,
    }));

    const userText =
      message ||
      "Analyze this image carefully and explain what you can identify. If it contains a question, solve it step by step.";

    const response = await completeNovaWithQuota({
      tier: "standard",
      maxTokens: 1400,
      temperature: 0.35,
      messages: [
        ...safeHistory,
        {
          role: "user",
          content: userText,
        },
      ],
      imageDataUrls: [imageDataUrl],
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        };

        send({ type: "start" });

        send({
          type: "done",
          content: response.content,
        });

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nova vision failed.";

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}