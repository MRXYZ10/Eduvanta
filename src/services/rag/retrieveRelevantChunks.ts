import { prisma } from "@/db/client";
import { Prisma } from "@prisma/client";
import { getEmbeddingProvider } from "@/services/ai/factory";

export interface RetrievedChunk {
  content: string;
  fileName: string;
  similarity: number; // 0-1, higher is more relevant
}

const MIN_SIMILARITY = 0.7; // below this, material is probably not actually relevant — don't force it into context

/**
 * Retrieves the top-k most relevant chunks for a query, optionally scoped
 * to a topic. Uses pgvector's cosine distance operator (`<=>`) via raw SQL
 * since Prisma Client has no native vector query support.
 *
 * Chunks below MIN_SIMILARITY are filtered out entirely rather than always
 * returning the "closest" k — if nothing meets the bar, the caller should
 * fall back to answering without material rather than forcing in
 * marginally-related content (see "AI should prefer provided educational
 * material when relevant" — "when relevant" is the operative condition).
 */
export async function retrieveRelevantChunks(
  query: string,
  opts: { topicId?: string; limit?: number } = {},
): Promise<RetrievedChunk[]> {
  const embeddingProvider = getEmbeddingProvider();
  if (!embeddingProvider.embed) return [];

  const { embedding } = await embeddingProvider.embed({ input: query });
  const vectorLiteral = `[${embedding.join(",")}]`;
  const limit = opts.limit ?? 4;

  // Raw SQL: join chunk -> material, optionally filter by topic, order by
  // cosine distance ascending (closer = more similar), convert to a
  // similarity score for the MIN_SIMILARITY filter and for transparency
  // in what gets surfaced to Nova. Prisma.sql/Prisma.empty compose the
  // optional topic filter safely — string-interpolating raw SQL fragments
  // directly (rather than through Prisma's tagged-template parameterization)
  // would reopen the injection risk parameterized queries exist to close.
  const topicFilter = opts.topicId ? Prisma.sql`AND m."topicId" = ${opts.topicId}` : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{ content: string; fileName: string; distance: number }>>`
    SELECT c.content, m."fileName", (c.embedding <=> ${vectorLiteral}::vector) AS distance
    FROM "LearningMaterialChunk" c
    JOIN "LearningMaterial" m ON m.id = c."learningMaterialId"
    WHERE m.status = 'ready'
      ${topicFilter}
    ORDER BY distance ASC
    LIMIT ${limit}
  `;

  return rows
    .map((r) => ({ content: r.content, fileName: r.fileName, similarity: 1 - r.distance }))
    .filter((r) => r.similarity >= MIN_SIMILARITY);
}

/** Formats retrieved chunks into a system-prompt block with honest attribution. */
export function formatRetrievedMaterial(chunks: RetrievedChunk[]): string | null {
  if (chunks.length === 0) return null;
  const byFile = new Map<string, string[]>();
  for (const c of chunks) {
    const list = byFile.get(c.fileName) ?? [];
    list.push(c.content);
    byFile.set(c.fileName, list);
  }
  const blocks = Array.from(byFile.entries()).map(
    ([fileName, contents]) => `From "${fileName}":\n${contents.join("\n---\n")}`,
  );
  return (
    "REFERENCE MATERIAL (uploaded to this course — prefer this over general knowledge when it's relevant to the question; " +
    "cite it by file name if you use it; never cite or reference material beyond what's shown here):\n\n" +
    blocks.join("\n\n")
  );
}
