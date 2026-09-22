"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Upload } from "lucide-react";

interface TopicOption {
  id: string;
  name: string;
}

export function MaterialUploader({ topics }: { topics: TopicOption[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [topicId, setTopicId] = useState(topics[0]?.id ?? "");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    if (topicId) formData.append("topicId", topicId);

    try {
      const res = await fetch("/api/materials/upload", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Upload failed.");
      setMessage(body.message);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong uploading this file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-lg border border-line px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Topic
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="rounded-md border border-line px-3 py-2 text-sm">
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <Button variant="quiet" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload className="mr-2 h-4 w-4" strokeWidth={1.75} />
          {uploading ? "Processing…" : "Upload PDF or text"}
        </Button>
        <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md" onChange={handleFileChange} className="hidden" />
      </div>
      {message && <p className="text-sm text-ink/70">{message}</p>}
      {error && <p className="text-sm text-mastery-attention">{error}</p>}
      <p className="mt-2 text-xs text-ink/40">
        Nova will prefer this material when it's relevant to a question about this topic, and will cite it by file name.
      </p>
    </div>
  );
}
