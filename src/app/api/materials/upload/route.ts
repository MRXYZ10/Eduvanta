import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { extractText } from "@/services/rag/extractText";
import { processLearningMaterial } from "@/services/rag/embedAndStore";
import { logApiError } from "@/services/observability/logger";

export const runtime = "nodejs"; // pdf-parse and Buffer aren't available on the Edge runtime

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  const topicId = formData.get("topicId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is too large (15MB max)" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let extractedText: string;
  try {
    extractedText = await extractText(buffer, file.name, file.type);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Couldn't extract text from this file";
    logApiError({ route: "/api/materials/upload", errorMessage, statusCode: 422, userId: user.id });
    return NextResponse.json({ error: errorMessage }, { status: 422 });
  }

  if (extractedText.trim().length === 0) {
    return NextResponse.json({ error: "No extractable text found in this file" }, { status: 422 });
  }

  const result = await processLearningMaterial({
    topicId: typeof topicId === "string" && topicId.length > 0 ? topicId : null,
    uploaderId: user.id,
    fileName: file.name,
    fileType: file.type || "unknown",
    extractedText,
  });

  return NextResponse.json({
    materialId: result.materialId,
    chunkCount: result.chunkCount,
    failedChunkCount: result.failedChunkCount,
    message:
      result.chunkCount === 0
        ? "Upload processed, but no chunks could be embedded — this material won't be used by Nova yet."
        : `Processed and embedded ${result.chunkCount} chunk(s) from ${file.name}.`,
  });
}
