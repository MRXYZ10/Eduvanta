"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

interface SearchResults {
  topics: Array<{ id: string; name: string }>;
  questions: Array<{ id: string; prompt: string; topicId: string | null; topicName: string | null }>;
  materials: Array<{ id: string; fileName: string; topicId: string | null; topicName: string | null }>;
  conversations: Array<{ id: string; title: string | null; updatedAt: string }>;
}

const EMPTY: SearchResults = { topics: [], questions: [], materials: [], conversations: [] };

export function SearchBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestRef.current?.abort();

    const normalized = query.trim();
    if (normalized.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    requestRef.current = controller;

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(normalized)}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Search failed");
        const body = (await res.json()) as SearchResults;
        if (!controller.signal.aborted) setResults(body);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (!controller.signal.aborted) setResults(EMPTY);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      controller.abort();
    };
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const hasAnyResults =
    results.topics.length + results.questions.length + results.materials.length + results.conversations.length > 0;

  return (
    <div className="relative" ref={containerRef}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-ink/70 hover:bg-ink/5"
          aria-label="Search"
        >
          <Search className="h-4 w-4" strokeWidth={1.75} />
        </button>
      ) : (
        <div className="flex items-center gap-1 rounded-md border border-line bg-paper px-2 py-1">
          <Search className="h-3.5 w-3.5 text-ink/40" strokeWidth={1.75} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics, questions, notes…"
            className="w-40 border-none text-sm outline-none placeholder:text-ink/40 md:w-64"
          />
          <button onClick={() => setOpen(false)} className="text-ink/40 hover:text-ink/70">
            <X className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      )}

      {open && query.trim().length >= 2 && (
        <div className="absolute right-0 top-10 z-20 max-h-96 w-80 overflow-y-auto rounded-lg border border-line bg-paper shadow-lg">
          {loading && <p className="px-4 py-4 text-sm text-ink/40">Searching…</p>}
          {!loading && !hasAnyResults && <p className="px-4 py-4 text-sm text-ink/40">No results for "{query}".</p>}

          {!loading && results.topics.length > 0 && (
            <div className="border-b border-line py-1">
              <p className="px-4 py-1 text-[11px] font-medium uppercase tracking-wide text-ink/40">Topics</p>
              {results.topics.map((t) => (
                <button key={t.id} onClick={() => go(`/practice/${t.id}`)} className="block w-full px-4 py-2 text-left text-sm hover:bg-ink/5">
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {!loading && results.questions.length > 0 && (
            <div className="border-b border-line py-1">
              <p className="px-4 py-1 text-[11px] font-medium uppercase tracking-wide text-ink/40">Questions</p>
              {results.questions.map((q) => (
                <button
                  key={q.id}
                  onClick={() => q.topicId && go(`/practice/${q.topicId}`)}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-ink/5"
                >
                  <span className="line-clamp-1">{q.prompt}</span>
                  {q.topicName && <span className="block text-xs text-ink/40">{q.topicName}</span>}
                </button>
              ))}
            </div>
          )}

          {!loading && results.materials.length > 0 && (
            <div className="border-b border-line py-1">
              <p className="px-4 py-1 text-[11px] font-medium uppercase tracking-wide text-ink/40">Course material</p>
              {results.materials.map((m) => (
                <button key={m.id} onClick={() => go("/materials")} className="block w-full px-4 py-2 text-left text-sm hover:bg-ink/5">
                  {m.fileName}
                  {m.topicName && <span className="block text-xs text-ink/40">{m.topicName}</span>}
                </button>
              ))}
            </div>
          )}

          {!loading && results.conversations.length > 0 && (
            <div className="py-1">
              <p className="px-4 py-1 text-[11px] font-medium uppercase tracking-wide text-ink/40">Nova conversations</p>
              {results.conversations.map((c) => (
                <button key={c.id} onClick={() => go("/tutor")} className="block w-full px-4 py-2 text-left text-sm hover:bg-ink/5">
                  {c.title ?? "Untitled conversation"}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
