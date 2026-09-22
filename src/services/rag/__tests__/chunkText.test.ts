import { describe, it, expect } from "vitest";
import { chunkText } from "../chunkText";

describe("chunkText", () => {
  it("returns empty array for empty input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });

  it("returns a single chunk when text is shorter than target size", () => {
    const text = "This is a short document about functions.";
    const chunks = chunkText(text, { targetChars: 1000 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it("splits long text into multiple chunks", () => {
    const sentence = "Functions map inputs to outputs. ";
    const longText = sentence.repeat(100);
    const chunks = chunkText(longText, { targetChars: 500, overlapChars: 50 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("keeps every chunk under a reasonable size ceiling", () => {
    const sentence = "This is one sentence in a long educational passage. ";
    const longText = sentence.repeat(50);
    const chunks = chunkText(longText, { targetChars: 300, overlapChars: 30 });
    for (const c of chunks) expect(c.length).toBeLessThan(300 + sentence.length + 30);
  });

  it("overlaps consecutive chunks so context isn't lost at boundaries", () => {
    const sentence = "Sentence number marker unique-token-here. ";
    const longText = Array.from({ length: 30 }, (_, i) => `Sentence ${i} content here. `).join("");
    const chunks = chunkText(longText, { targetChars: 200, overlapChars: 40 });
    // The end of chunk N should share some text with the start of chunk N+1.
    if (chunks.length > 1) {
      const endOfFirst = chunks[0].slice(-20);
      expect(chunks[1].includes(endOfFirst.trim().split(" ").slice(-2).join(" "))).toBe(true);
    }
  });
});
