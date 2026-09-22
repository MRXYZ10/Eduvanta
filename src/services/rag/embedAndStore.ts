import { prisma } from "@/db/client";
import { chunkText } from "./chunkText";
import { getEmbeddingProvider } from "@/services/ai/factory";
import { logApiError } from "@/services/observability/logger";

/**
 * Prisma's schema declares `embedding Unsupported("vector")?` because
 * Prisma Client has no native pgvector type — reads/writes to that column
 * go through raw SQL here, with the embedding passed as a parameterized
 * string literal (`'[0.1,0.2,...]'`) that Postgres casts to `vector`. This
 * is the standard pattern for pgvector + Prisma until first-class support
 * lands.
 */
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export interface ProcessMaterialResult {
  materialId: string;
  chunkCount: number;
  failedChunkCount: number;
}

export async function processLearningMaterial(params: {
  topicId: string | null;
  uploaderId: string;
  fileName: string;
  fileType: string;
  extractedText: string;
}): Promise<ProcessMaterialResult> {
  const material = await prisma.learningMaterial.create({
    data: {
      topicId: params.topicId,
      uploaderId: params.uploaderId,
      fileName: params.fileName,
      fileType: params.fileType,
      status: "processing",
    },
  });

  const chunks = chunkText(params.extractedText);
  if (chunks.length === 0) {
    await prisma.learningMaterial.update({ where: { id: material.id }, data: { status: "failed" } });
    return { materialId: material.id, chunkCount: 0, failedChunkCount: 0 };
  }

  const embeddingProvider = getEmbeddingProvider();
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < chunks.length; i++) {
    try {
      if (!embeddingProvider.embed) throw new Error("Configured embedding provider has no embed() method");
      const { embedding } = await embeddingProvider.embed({ input: chunks[i] });

      const chunkRow = await prisma.learningMaterialChunk.create({
        data: { learningMaterialId: material.id, content: chunks[i], chunkIndex: i },
      });
      await prisma.$executeRaw`
        UPDATE "LearningMaterialChunk" SET embedding = ${toVectorLiteral(embedding)}::vector WHERE id = ${chunkRow.id}
      `;
      succeeded++;
    } catch (err) {
      failed++; // one bad chunk (e.g. a transient embedding API failure) doesn't abort the whole document
      logApiError({
        route: "services/rag/embedAndStore:chunk",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await prisma.learningMaterial.update({
    where: { id: material.id },
    data: { status: succeeded > 0 ? "ready" : "failed" },
  });

  return { materialId: material.id, chunkCount: succeeded, failedChunkCount: failed };
}
