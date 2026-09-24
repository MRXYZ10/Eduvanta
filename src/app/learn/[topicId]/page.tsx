import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Lightbulb, Target } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/db/client";
import { AppShell } from "@/components/AppShell";

const LESSONS: Record<string, { overview: string; keyIdeas: string[]; examples: string[]; checklist: string[] }> = {
  functions: {
    overview: "A function assigns each input exactly one output. Master domain, range, composition and inverse functions before moving to harder problems.",
    keyIdeas: ["Domain is the set of allowed inputs; range is the set of outputs produced.", "Composition (f ∘ g)(x) means apply g first, then f.", "An inverse exists as a function when the original function is one-to-one on its domain."],
    examples: ["If f(x)=x+3 and g(x)=2x, then (f∘g)(2)=7.", "For f(x)=3x−2, solve y=3x−2 for x to get f⁻¹(y)=(y+2)/3."],
    checklist: ["I can find a function's domain and range.", "I can evaluate f(g(x)) without reversing the order.", "I can find an inverse and verify it by composition."],
  },
  relations: {
    overview: "Relations describe which ordered pairs are connected. The core skill is checking properties systematically and combining them into equivalence relations and partial orders.",
    keyIdeas: ["Reflexive: every a is related to itself.", "Symmetric: aRb implies bRa.", "Transitive: aRb and bRc imply aRc. Equivalence relations have all three; partial orders use reflexive, antisymmetric and transitive."],
    examples: ["Equality on any set is reflexive, symmetric and transitive.", "The subset relation ⊆ is a partial order because it is reflexive, antisymmetric and transitive."],
    checklist: ["I can test reflexivity, symmetry and transitivity from a relation.", "I can recognize an equivalence relation.", "I can distinguish antisymmetry from symmetry."],
  },
  sets: {
    overview: "Set theory gives you the language for grouping objects and reasoning about membership, operations and counting. These ideas power probability, databases and discrete mathematics.",
    keyIdeas: ["Union collects elements from either set; intersection keeps common elements.", "Difference removes elements of one set from another; complements depend on a universal set.", "For finite sets, |A∪B|=|A|+|B|−|A∩B|."],
    examples: ["If A={1,2,3} and B={2,3,4}, then A∩B={2,3} and A∪B={1,2,3,4}.", "A four-element set has 2⁴=16 subsets."],
    checklist: ["I can perform union, intersection and difference.", "I can count subsets and Cartesian products.", "I can apply inclusion–exclusion correctly."],
  },
};

function lessonFor(name: string) {
  const k = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return Object.entries(LESSONS).find(([key]) => k === key || k.includes(key) || key.includes(k))?.[1] ?? null;
}

export default async function LearnTopicPage({ params }: { params: { topicId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const topic = await prisma.topic.findUnique({ where: { id: params.topicId }, include: { subject: { include: { course: true } }, concepts: true, subtopics: { orderBy: { order: "asc" } } } });
  if (!topic) redirect("/learn");
  const enrolled = user.role === "ADMIN" || user.role === "TEACHER" || !!(await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: topic.subject.courseId } } }));
  if (!enrolled) redirect("/learn");
  const lesson = lessonFor(topic.name);

  return <AppShell>
    <div className="mb-6"><Link href="/learn" className="inline-flex items-center gap-2 text-xs font-medium text-ink/50 transition hover:text-cobalt"><ArrowLeft className="h-3.5 w-3.5" /> Back to Learn</Link></div>
    <header className="relative overflow-hidden rounded-[2rem] border border-line/70 bg-gradient-to-br from-cobalt-soft/80 via-paper to-signal-soft/35 p-6 shadow-sm sm:p-8">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cobalt/10 blur-3xl" />
      <div className="relative">
        <div className="mb-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-cobalt/75"><span className="rounded-full bg-paper/70 px-2.5 py-1">{topic.subject.course.title}</span><span className="rounded-full bg-paper/70 px-2.5 py-1">{topic.subject.name}</span></div>
        <h1 className="text-3xl sm:text-4xl">{topic.name}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">{lesson?.overview ?? `Build a strong foundation in ${topic.name} through guided concepts, examples and adaptive practice.`}</p>
        <div className="mt-5 flex flex-wrap gap-3"><Link href={`/practice/${topic.id}`} className="inline-flex items-center gap-2 rounded-xl bg-cobalt px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cobalt/15 transition hover:-translate-y-0.5 hover:shadow-xl"><Target className="h-4 w-4" /> Start adaptive quiz <ArrowRight className="h-4 w-4" /></Link><span className="inline-flex items-center gap-2 rounded-xl border border-line/70 bg-paper/70 px-4 py-2.5 text-sm text-ink/55"><BookOpen className="h-4 w-4" /> {topic.concepts.length} concepts</span></div>
      </div>
    </header>

    <div className="mt-8 grid gap-5 lg:grid-cols-2">
      <section className="rounded-3xl border border-line/70 bg-paper/65 p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-signal" /><h2 className="text-lg">Core ideas</h2></div><div className="mt-4 space-y-3">{(lesson?.keyIdeas ?? topic.concepts.map(c => c.description || c.name)).map((item,i)=><div key={i} className="flex gap-3 rounded-2xl border border-line/50 bg-paper/60 p-4"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cobalt-soft text-xs font-semibold text-cobalt">{i+1}</span><p className="text-sm leading-6 text-ink/70">{item}</p></div>)}</div></section>
      <section className="rounded-3xl border border-line/70 bg-paper/65 p-5 shadow-sm sm:p-6"><h2 className="text-lg">Worked examples</h2><div className="mt-4 space-y-3">{(lesson?.examples ?? ["Start with the definition, identify the given information, then apply the relevant property."]).map((item,i)=><div key={i} className="rounded-2xl border border-signal/15 bg-signal-soft/45 p-4 text-sm leading-6 text-ink/70">{item}</div>)}</div></section>
    </div>

    <section className="mt-5 rounded-3xl border border-line/70 bg-paper/65 p-5 shadow-sm sm:p-6"><h2 className="text-lg">Your learning checklist</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{(lesson?.checklist ?? topic.concepts.map(c => `Understand ${c.name}`)).map((item,i)=><div key={i} className="flex gap-3 rounded-2xl border border-line/50 p-4"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cobalt" /><p className="text-sm leading-5 text-ink/65">{item}</p></div>)}</div></section>

    {topic.subtopics.length > 0 && <section className="mt-5 rounded-3xl border border-line/70 bg-paper/65 p-5 shadow-sm sm:p-6"><h2 className="text-lg">Subtopics</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{topic.subtopics.map((s)=><div key={s.id} className="rounded-2xl border border-line/50 bg-paper/50 p-4"><p className="font-medium text-sm">{s.name}</p></div>)}</div></section>}
  </AppShell>;
}
