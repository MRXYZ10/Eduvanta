"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface CourseOption {
  id: string;
  title: string;
}

export function AssignmentForm({ courses }: { courses: CourseOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId || !title) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, title, dueDate: dueDate || undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't create assignment.");
      toast.show(`"${title}" added.`, "success");
      setTitle("");
      setDueDate("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (courses.length === 0) {
    return <p className="text-sm text-ink/50">Create a course before adding assignments.</p>;
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-lg border border-line px-4 py-4">
      <label className="flex flex-col gap-1 text-sm">
        Course
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="rounded-md border border-line px-3 py-2 text-sm"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-1 min-w-[10rem] flex-col gap-1 text-sm">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Functions problem set 2"
          className="rounded-md border border-line px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Due date
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-md border border-line px-3 py-2 text-sm"
        />
      </label>
      <Button type="submit" disabled={loading || !title}>
        {loading ? "Adding…" : "Add"}
      </Button>
      {error && <p className="w-full text-sm text-mastery-attention">{error}</p>}
    </form>
  );
}
