import { prisma } from "@/db/client";

/**
 * Simple substring search via Postgres ILIKE — not full-text search (no
 * `tsvector`/`to_tsquery` yet) and not semantic. That's a deliberate scope
 * choice: the product spec lists semantic search as an explicit
 * "eventually," and ILIKE across a handful of tables is enough for a
 * first version without a new index/migration. If result quality becomes
 * a problem at real content volume, upgrading to Postgres full-text search
 * (a `@@` query against a generated `tsvector` column) is a schema
 * migration + a query change here, not a rewrite of the search UI.
 *
 * Authorization is category-specific, not a single blanket rule:
 * - Topics and Questions are shared course content.
 * - Uploaded Materials and Conversations are private to the authenticated
 *   user unless the product later introduces explicit course-level sharing.
 *   Search never returns another student's private material or conversation.
 */

export interface SearchResults {
  topics: Array<{ id: string; name: string }>;
  questions: Array<{ id: string; prompt: string; topicId: string | null; topicName: string | null }>;
  materials: Array<{ id: string; fileName: string; topicId: string | null; topicName: string | null }>;
  conversations: Array<{ id: string; title: string | null; updatedAt: Date }>;
}

const RESULT_LIMIT_PER_CATEGORY = 5;

export async function searchAll(query: string, userId: string): Promise<SearchResults> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { topics: [], questions: [], materials: [], conversations: [] };
  }

  const [topics, questions, materials, conversations] = await Promise.all([
    prisma.topic.findMany({
      where: { name: { contains: trimmed, mode: "insensitive" } },
      select: { id: true, name: true },
      take: RESULT_LIMIT_PER_CATEGORY,
    }),
    prisma.question.findMany({
      where: { prompt: { contains: trimmed, mode: "insensitive" }, validated: true },
      select: { id: true, prompt: true, topicId: true, topic: { select: { name: true } } },
      take: RESULT_LIMIT_PER_CATEGORY,
    }),
    prisma.learningMaterial.findMany({
      where: { uploaderId: userId, fileName: { contains: trimmed, mode: "insensitive" }, status: "ready" },
      select: { id: true, fileName: true, topicId: true, topic: { select: { name: true } } },
      take: RESULT_LIMIT_PER_CATEGORY,
    }),
    prisma.conversation.findMany({
      where: {
        userId, // never search across users — see doc comment above
        OR: [
          { title: { contains: trimmed, mode: "insensitive" } },
          { messages: { some: { role: "user", content: { contains: trimmed, mode: "insensitive" } } } },
        ],
      },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: RESULT_LIMIT_PER_CATEGORY,
    }),
  ]);

  return {
    topics,
    questions: questions.map((q) => ({ id: q.id, prompt: q.prompt, topicId: q.topicId, topicName: q.topic?.name ?? null })),
    materials: materials.map((m) => ({ id: m.id, fileName: m.fileName, topicId: m.topicId, topicName: m.topic?.name ?? null })),
    conversations,
  };
}
