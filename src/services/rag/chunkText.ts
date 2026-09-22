/**
 * Splits extracted document text into overlapping chunks for embedding.
 * Sentence-aware: prefers to break at sentence boundaries near the target
 * size rather than mid-sentence, so a retrieved chunk reads as a coherent
 * unit instead of a ragged fragment.
 */

export interface ChunkOptions {
  targetChars?: number; // approximate chunk size in characters
  overlapChars?: number; // overlap between consecutive chunks, for context continuity
}

const DEFAULTS: Required<ChunkOptions> = { targetChars: 1000, overlapChars: 150 };

export function chunkText(text: string, opts: ChunkOptions = {}): string[] {
  const { targetChars, overlapChars } = { ...DEFAULTS, ...opts };
  const cleaned = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (cleaned.length === 0) return [];
  if (cleaned.length <= targetChars) return [cleaned];

  // Split into sentences (naive but adequate for educational prose) so
  // chunk boundaries can snap to them.
  const sentences = cleaned.match(/[^.!?\n]+[.!?]?(?:\n+|\s+|$)/g) ?? [cleaned];

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length > targetChars && current.length > 0) {
      chunks.push(current.trim());
      // Start the next chunk with the tail of the previous one for overlap.
      const overlapStart = Math.max(0, current.length - overlapChars);
      current = current.slice(overlapStart) + sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim().length > 0) chunks.push(current.trim());

  return chunks;
}
