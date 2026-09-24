"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CourseCatalog({ courses }: { courses: Array<{ id: string; title: string; description: string | null; examGoal: string | null; teacherName: string | null; studentCount: number; subjectCount: number; topicCount: number; subjects: Array<{ id: string; name: string; topicCount: number }>; enrolled: boolean }> }) {
  const [items, setItems] = useState(courses);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enroll(courseId: string) {
    setLoading(courseId); setError(null);
    try {
      const res = await fetch("/api/courses/enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not enroll");
      setItems((current) => current.map((course) => course.id === courseId ? { ...course, enrolled: true, studentCount: course.studentCount + 1 } : course));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not enroll"); }
    finally { setLoading(null); }
  }

  if (items.length === 0) return <div className="rounded-3xl border border-line/70 bg-paper/60 p-8 text-center text-sm text-ink/50">No courses are available yet.</div>;

  return <div className="space-y-4">
    {error && <p className="text-sm text-mastery-attention">{error}</p>}
    {items.map((course) => <article key={course.id} className="rounded-3xl border border-line/70 bg-paper/60 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-cobalt">
            {course.examGoal && <span className="rounded-full bg-cobalt-soft px-2.5 py-1">{course.examGoal}</span>}
            <span className="rounded-full bg-ink/5 px-2.5 py-1">{course.topicCount} topics</span>
          </div>
          <h2 className="text-xl font-medium">{course.title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/60">{course.description ?? "Build structured understanding through guided practice and progress tracking."}</p>
          <p className="mt-3 text-xs text-ink/40">{course.subjectCount} subjects · {course.studentCount} learners{course.teacherName ? ` · ${course.teacherName}` : ""}</p>
        </div>
        <div className="shrink-0">{course.enrolled ? <Link href="/learn"><Button variant="quiet"><Check className="mr-2 h-4 w-4" />Enrolled</Button></Link> : <Button onClick={() => enroll(course.id)} disabled={loading === course.id}>{loading === course.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}Join course</Button>}</div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">{course.subjects.slice(0, 6).map((subject) => <span key={subject.id} className="rounded-full border border-line/70 px-3 py-1.5 text-xs text-ink/55">{subject.name} · {subject.topicCount}</span>)}</div>
    </article>)}
  </div>;
}
