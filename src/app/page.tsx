import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  TutorMockup,
  PracticeMockup,
  LearningIntelligenceMockup,
  MistakeVaultMockup,
  ExamReadinessMockup,
  StudyPlannerMockup,
} from "@/components/landing/ProductMockups";

const FEATURES = [
  {
    title: "AI Tutor",
    description: "Nova understands your current topic, mastery, and mistakes — not just what you typed.",
    mockup: <TutorMockup />,
  },
  {
    title: "Adaptive Practice",
    description: "Difficulty adjusts in real time: correct and fast moves you up, a repeated mistake slows down and teaches.",
    mockup: <PracticeMockup />,
  },
  {
    title: "Learning Intelligence",
    description: "A real mastery score — weighted by recency, difficulty, and consistency, not just correct-over-total.",
    mockup: <LearningIntelligenceMockup />,
  },
  {
    title: "Mistake Intelligence",
    description: "When the same mistake repeats, Nova builds a targeted mini-lesson and fresh practice for exactly that gap.",
    mockup: <MistakeVaultMockup />,
  },
  {
    title: "Exam Readiness",
    description: "An honest internal indicator, broken down by topic — never dressed up as a guarantee.",
    mockup: <ExamReadinessMockup />,
  },
  {
    title: "Study Planner",
    description: "Built around what you're actually weak at, and rebalanced — not just pushed forward — when you fall behind.",
    mockup: <StudyPlannerMockup />,
  },
];

// This is the root route ("/"). Middleware (see middleware.ts) redirects
// an already-authenticated visitor straight to /dashboard before the
// request ever reaches this component — so anyone who actually renders
// this page is logged out, and there's no need for this file to check
// auth state itself.
export default function LandingPage() {
  return (
    <main className="bg-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 md:px-8">
        <span className="font-serif text-lg">EduVanta</span>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-ink/70 hover:text-ink">
            Log in
          </Link>
          <Link href="/signup">
            <Button variant="quiet">Sign up</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center md:py-24">
        <h1 className="mb-4 text-3xl leading-tight md:text-5xl">Meet the AI that learns how you learn.</h1>
        <p className="mx-auto mb-8 max-w-xl text-base text-ink/60 md:text-lg">
          Personalized practice, intelligent feedback, and a study plan that adapts to you.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup">
            <Button className="px-6 py-3">Start Learning</Button>
          </Link>
          <a href="#features" className="text-sm text-ink/60 underline underline-offset-2 hover:text-ink">
            See how it works
          </a>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 md:gap-12">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <h2 className="mb-2 text-xl">{f.title}</h2>
              <p className="mb-4 text-sm text-ink/60">{f.description}</p>
              {f.mockup}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h2 className="mb-4 text-2xl">Ready to see what you actually need to learn next?</h2>
        <Link href="/signup">
          <Button className="px-6 py-3">Start Learning</Button>
        </Link>
      </section>

      <footer className="border-t border-line px-4 py-6 text-center text-xs text-ink/40">
        EduVanta AI
      </footer>
    </main>
  );
}
