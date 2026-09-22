# Architecture — How This Integrates

## The core loop, end to end

```
Student answers a question
        │
        ▼
POST /api/practice/submit
        │
        ├─► server-side correctness check (never trusts client)
        ├─► decideNextDifficulty()      ── adaptive ladder logic
        ├─► completeWithRetry() ─► AI provider ─► parsePracticeFeedback()
        │        (Zod-validated; falls back to rule-based feedback on failure)
        ├─► Mistake Vault upsert (occurrence tracking, resolved flag)
        └─► calculateMastery() over recent Answer rows ─► Mastery upsert
                │
                ▼
        Response: { isCorrect, feedback, adaptive, mastery }
```

Every step is a **separate, independently-testable service function**
(`services/practice/adaptiveDifficulty.ts`, `services/mastery/calculateMastery.ts`,
`services/ai/validate.ts`) — the API route just orchestrates them. That's
deliberate: the mastery algorithm and the difficulty algorithm have zero
dependency on Next.js, Prisma, or each other, so they can be unit tested in
isolation and reused by a future batch re-scoring job or exam simulator.

## AI provider abstraction

Nothing outside `services/ai/` imports `openai`, `@anthropic-ai/sdk`, or a
Gemini SDK directly. Feature code calls `completeWithRetry()`, which:

1. Resolves the configured provider via `AI_PROVIDER` env var
2. Falls back to `MockAiProvider` in development if no key is set
3. Retries once on retryable errors (429/5xx), never on 4xx auth/validation errors
4. Returns a uniform `{ content, provider, model, usage }` shape regardless
   of which vendor answered

Swapping providers is a one-line env var change. Adding a fourth provider
means implementing `AiProvider` and adding one case to `factory.ts` — no
feature code changes.

## Context building (`buildStudentLearningContext`)

This is the boundary between "everything we know about a student" and
"what Nova is allowed to see." It intentionally excludes: email, auth
identifiers, full attempt history, other students' data. It includes only
what changes tutoring quality: exam goal/date, a mastery snapshot, unresolved
recurring mistakes, and the next few planned study sessions. Every AI-facing
route calls this rather than querying Prisma ad hoc, so the privacy boundary
lives in one place and can't be bypassed by a new feature forgetting to filter.

## Mastery ≠ accuracy

`calculateMastery()` deliberately never computes `correct/total`. It weighs:

- **recency** (14-day half-life decay) — a concept nailed a month ago and
  never touched since shouldn't still read as "mastered"
- **difficulty** — correct-on-hard counts more than correct-on-easy
- **consistency** — high variance across attempts caps the score, since
  an erratic 70% average is a weaker signal than a steady 70%
- **repeated mistakes** — the same misconception recurring drags mastery
  down even if raw accuracy looks fine elsewhere
- **confidence** — a small, capped nudge from self-reported confidence,
  so it can't override objective performance

This is explicitly labeled in the UI copy as an internal learning indicator,
not a certified psychometric score — same posture as Exam Readiness once
that's built.

## Adaptive difficulty

Pure function, no I/O (`decideNextDifficulty`). Rules match the product
spec directly: correct+fast or a 3-streak → harder; correct-but-slow →
hold; a single wrong answer → hold while the mistake is analyzed; the
*same concept* missed twice in a row → step down a level and flag
`teach_concept`. "Same concept" is computed by comparing the current
question's `conceptId` against the previous `Answer` in the same `Attempt`,
so a wrong answer on an unrelated concept doesn't wrongly trigger a
step-down.

## Failure handling

`/api/tutor/chat` persists the student's message to the database *before*
calling the AI provider, so a failed AI call never loses what the student
typed — the client can retry without re-sending. `/api/practice/submit`
falls back to rule-based feedback (using the question's stored `explanation`
and a small fixed mastery delta) if the AI call fails or returns invalid
JSON, so a flaky AI provider degrades the *quality* of feedback, not the
availability of the practice loop.

## Study plan generation and rebalancing

`generateStudyPlan()` is deliberately a deterministic algorithm, not raw AI
text — dates and durations need to be *correct*, not plausible-sounding.
It ranks topics by a priority score (`100 - masteryScore` plus a penalty
per unresolved mistake, with unattempted topics treated as weak so they
aren't neglected), then does a weighted round-robin across the days between
now and the target date, inserting a revision day on the weakest topic every
4 days. Nova's only job (`buildPlanRationale`) is to explain the already-
computed plan in plain language — it never invents a date or duration, and
falls back to a template sentence if the AI call fails, so a flaky provider
never blocks plan creation.

Rebalancing (`rebalanceMissedWork`) is a separate greedy allocator: when
sessions are missed, their owed minutes are handed out topic-by-topic in
priority order, each getting as much of a capped daily "catch-up" budget
as remains once the more urgent topics ahead of it are served. This means
under a real time crunch, a weak topic's make-up work is protected and a
strong topic's missed session is what gets quietly dropped — not an equal
percentage shaved off both, and not an ever-growing backlog stacked onto
day one. `/api/planner/reschedule` auto-marks overdue pending sessions as
missed before running this, then persists the new catch-up sessions and
marks the originals `rescheduled` so a second rebalance call doesn't
double-count them.

## Onboarding feeds the planner directly

`/api/onboarding/complete` doesn't call the `/api/planner/*` routes over
HTTP — it imports `generateStudyPlan()` and `buildPlanRationale()` directly,
the same functions the planner page's "Generate plan" button uses. A brand
new student has no `Mastery` or `Mistake` rows yet, so every selected
topic is passed in as `masteryScore: null`, which the algorithm already
treats as needing attention (see priority scoring above) rather than
silently skipping. This is why onboarding and the planner never drift out
of sync: there's one scheduling algorithm, not two.

## Exam Simulator reuses practice's data model, not a parallel one

An `ExamAttempt` doesn't get its own answer table — `Attempt` gained an
optional `examAttemptId` so an exam sitting is just an `Attempt` with
`mode: "exam"`, and its `Answer` rows are the exact same rows adaptive
practice writes. That's why `scoreExam()` can compute topic and difficulty
breakdowns using the same `Question.topic`/`Question.difficulty`
relations practice already relies on — there's no second grading path to
keep in sync.

The "what actually cost you marks" report follows the same split as the
planner: `scoreExam()` computes score, per-topic accuracy, per-difficulty
accuracy, and a categorized list of `costlyQuestions` (wrong-and-fast =
likely guess, wrong-and-flagged-for-review = the highest-signal miss,
correct-but-very-slow = a time cost even without being wrong) — all
deterministic, all testable without touching the AI. `buildExamNarrative()`
is handed those exact numbers and told explicitly not to invent anything
beyond them; on failure it falls back to a template sentence built from the
same data, so a flaky AI provider degrades the report's prose, never its
accuracy.

Auto-save + resume: `/api/exam/answer` upserts on `(attemptId, questionId)`
so re-answering a question updates in place, and `/api/exam/start` returns
the existing in-progress `ExamAttempt` instead of creating a duplicate if
the student already has one open — refreshing mid-exam doesn't reset the
timer, because the deadline is derived from the stored `startedAt`, not
from client state.

## Auth: middleware refreshes, route handlers gate

Session refresh and route protection are deliberately split. `middleware.ts`
runs on every request, calls `supabase.auth.getUser()` (which re-validates
against Supabase rather than trusting a possibly-stale cookie), and writes
back a refreshed session cookie via the `set()` callback — this is what
keeps a student logged in across a long session without silent expiry.
It also redirects unauthenticated requests for *pages* to `/login`.

API routes are deliberately excluded from that redirect: a `fetch()` call
expects JSON, and a 302 to an HTML login page would silently break every
`.json()` call on the client instead of surfacing a clear error. Each route
handler already calls `getCurrentUser()` itself and returns a real `401`
(see any file under `app/api/`), so middleware's job for `/api/*` is only
to keep the cookie fresh, not to gate access a second time.

`getCurrentUser()` (`lib/auth.ts`) upserts a `User` row keyed on the
Supabase-verified email on every call. This means there's no separate
"create your app profile" step after email verification that a student
could get stuck on — the first authenticated request to any page
provisions it transparently.

Login and forgot-password intentionally return the same response whether
or not an email is registered, so neither page can be used to enumerate
which addresses have accounts.

## Teacher Dashboard: class analytics without a second grading path

`aggregateClassMastery()` and `identifyWeakTopics()` are pure functions
over plain `{studentId, topicName, score}` rows — the same shape whether
they come from `Mastery` records (which is what the dashboard actually
queries) or a test fixture. A topic is only flagged as class-wide weak when
at least a configurable minimum number of students have attempted it *and*
half or more are below the struggling threshold — a single student having
a rough week never triggers a class-wide AI insight.

"Generate Remedial Practice" runs the same question-generation pipeline
described in the product spec's "QUESTION QUALITY" section:
`generateValidatedQuestion()` asks the AI for one MCQ, runs it through
`validateGeneratedQuestion()` (the same validator used elsewhere in the
codebase — one correct-option check, option-count check, non-trivial
explanation check), and if it fails, sends the AI back its own mistakes
for exactly one correction attempt before giving up on that question
entirely. Only questions that pass validation are ever persisted with
`validated: true` — a silently-invalid AI question can never reach a
student, and the teacher sees exactly how many of the 5 requested
questions actually made it through.

## RAG: relevance-gated, never forced

`retrieveRelevantChunks()` filters out anything below a 0.7 cosine-similarity
threshold rather than always returning "the closest k chunks regardless of
how close they actually are." This matters because the product spec's
instruction is to prefer uploaded material "when relevant" — always
injecting the nearest chunks into Nova's context, even when nothing
uploaded is actually on-topic, would make Nova reference tangentially
related material just because retrieval always returns *something*.

The vector column is declared in Prisma as `Unsupported("vector")` because
Prisma Client has no native pgvector type yet — both the write path
(`embedAndStore.ts`) and the read path (`retrieveRelevantChunks.ts`) go
through raw SQL, with the embedding passed as a parameterized string
(`'[0.1,0.2,...]'::vector`) rather than string-interpolated directly, so
the injection risk parameterized queries exist to close stays closed.

Embeddings are resolved independently of the chat provider
(`getEmbeddingProvider()` in `services/ai/factory.ts`): if `AI_PROVIDER`
is `anthropic` (the default) but `OPENAI_API_KEY` is also set, RAG uses
OpenAI for embeddings while Nova's actual conversation still goes through
Anthropic — Anthropic and this app's Gemini provider don't implement an
embeddings API, so mixing providers this way is intentional, not a
fallback path.

## Mistake Vault reuses the teacher dashboard's question pipeline

`/api/mistakes/fix` doesn't have its own question-generation logic — it
calls the exact same `generateValidatedQuestion()` used by
`/api/teacher/remedial-practice`. The only difference is who triggers it
(a teacher noticing a class-wide pattern vs. a student's own mistake
recurring 3+ times) and where the resulting questions get tagged
(`conceptId` here, since a student's mistake is concept-scoped; topic-level
for the teacher's class-wide case). Keeping one pipeline means a
validation-logic fix or prompt improvement helps both call sites at once.

The mini-lesson follows the same AI-narrates-fallback-if-it-fails pattern
as the study planner's rationale and the exam's "what cost you marks"
narrative — `buildMiniLesson()` is given the student's actual wrong
answer and the correct one so it addresses their specific error, and
`templateFallbackLesson()` produces a still-useful (if more generic)
paragraph if the AI call fails.

## Rate limiting: sized per route, not one global number

`enforceRateLimit(userId, bucket)` is called as the second line of every
AI-calling route, right after resolving the user. Three buckets exist
because a chat message and a 5-question generation job cost the AI
provider very differently: `aiChat` (20/5min) covers `tutor/chat`;
`aiGeneration` (10/hour) covers routes that fire up to 5-6 AI calls per
request (`teacher/remedial-practice`, `mistakes/fix`); `aiLightweight`
(30/min) covers routes with exactly one AI call per request
(`practice/submit`, `exam/submit`, `planner/generate`,
`onboarding/complete`). A single shared limit across all of these would
either be too loose for the expensive routes or too strict for a normal
chat conversation.

The limiter itself (`SlidingWindowRateLimiter`) is a plain class with an
injectable clock, tested without touching Next.js or a real clock at all.
It's in-memory and per-server-instance — correct for local dev and a
single-instance deployment, but the doc comment on the class flags exactly
what to swap (the internal `hits` Map) for a Redis-backed version once the
app runs on more than one instance.

## Admin Dashboard: honest about what's a proxy

`getAdminOverview()`'s "AI usage" section is explicitly labeled in the UI
as derived from stored records (conversation counts, AI-generated question
counts) rather than live per-call tracking — because that's what it
actually is. Real AI latency/error/usage tracking needs the Observability
work (structured logging around `completeWithRetry()`) that isn't built
yet; this view doesn't pretend otherwise by using vague labels that could
be mistaken for the real thing.

The `unvalidatedQuestions` count is a genuine health signal, not
decoration: every question-generation code path in this codebase
(`services/ai/generateQuestion.ts`, used by both the teacher dashboard and
the Mistake Vault) discards a question that fails validation rather than
persisting it — so in normal operation this count should always read
zero. If it's ever non-zero, something wrote a `Question` row outside
that pipeline, which is worth knowing about.

## Focus Mode adds a prop, not a second practice engine

`PracticeSession` gained exactly one optional prop — `onAnswered?: (correct:
boolean) => void` — called from inside its existing submit success path.
Focus Mode is the only current caller that passes it, using it purely to
tally a running count for its own header; `PracticeSession` doesn't know
or care who's listening. This was the deliberate alternative to writing a
second, Focus-Mode-specific practice loop: one question-answering
implementation, two entry points (`/practice/:topicId` for a direct session,
`/focus` for a timed one).

The session summary reads the topic's *current* `Mastery` row for
"concept improvement" rather than snapshotting a before/after — because
`/api/practice/submit` already recomputes that row after every single
answer, by the time a focus session ends its Mastery row already reflects
everything that happened during it. No separate tracking needed.

## Notifications: reactive by necessity, dedup'd by design

There's no background job scheduler in this stack (no Vercel Cron,
Supabase scheduled function, or queue worker wired up), so nothing in this
codebase can notify a student who isn't currently loading a page. Every
trigger here is reactive: `checkStudyReminder()` runs when the dashboard
server-renders and checks whether today has pending `StudySession` rows;
the streak notification fires from inside `/api/practice/submit` and
`/api/exam/submit` right after `recordStreakActivity()` reports a genuine
extension. This is a real product gap, not a hidden one — see the
Priority 3 checklist for what proactive (push) notifications would need.

Every trigger goes through `createNotificationIfNotDuplicate()`, which
checks for a matching `(userId, type, title)` notification within a
rolling window before creating a new one. This is the single place "do not
spam users" is enforced, rather than each trigger needing its own ad hoc
throttling logic — a new notification type added later only needs to call
this function correctly, not reinvent dedup.

Streak tracking (`services/gamification/updateStreak.ts`) is a pure
function over `{currentStreak, longestStreak, lastActiveDate}` plus an
activity date — no I/O, so every day-boundary edge case (same-day repeat,
next-day extension, multi-day gap reset, tying vs. beating a prior record)
is directly testable. `recordStreakActivity()` wraps it with the actual
`Streak` row read/write and is itself idempotent within a day, so calling
it after every practice answer (rather than once per session) is safe and
requires no separate "have I already counted today" bookkeeping.

The `Enrollment` model (added after this section was first written — see
`DATABASE.md`) now exists, so "which students are in which course" is
answerable. Assignment-due and exam-date reminders still aren't wired up,
but that's now a route-level follow-up, not a missing foundational model.

## Achievements reuse signals, never recompute them

Every `check*Achievement` function in `checkAchievements.ts` takes inputs
that some other part of the codebase already computed for a different
reason: `isNewRecord` comes from `updateStreak()` (used for the streak
notification too), the mastery band comes from `calculateMastery()` (used
for the dashboard and mastery display), and the exam personal-best
comparison uses `ExamAttempt.score` rows already persisted by every past
exam submission. No achievement check re-derives a number from scratch —
this is deliberate: an achievement should never disagree with what the
rest of the app is telling the student about their own progress.

`awardAchievement()`'s dedup is unconditional (no time window), unlike
`createNotificationIfNotDuplicate()`'s rolling window — a mastery milestone
or a personal best is a permanent fact once true, so "has this exact
(userId, type, label) achievement already been recorded" is the right
question, not "recently."

## Enrollment: additive, not a migration of existing data

`Enrollment` was added without touching how teacher analytics work —
`getTeacherOverview()` still derives `classStats`/`weakTopics` from
`Mastery` rows (engagement data), and now *also* reports
`enrolledStudentCount` from real `Enrollment` rows (roster data), shown
side by side rather than one replacing the other. They answer different
questions — "how is the class actually doing" vs. "how many students are
in the class" — and conflating them would have been a regression, not a
fix. The only write path for `Enrollment` right now is onboarding
auto-enrollment; there's no course catalog/join flow yet (see
`eduvanta-remaining-work.md`).

## Design system: built to be used, not just built

Every new `components/ui/` primitive this round replaced a real bespoke
implementation rather than sitting unused alongside one: `ExamRunner`'s
inline submit-confirmation `<div>` became `Modal`; `PracticeSession`'s
inline error block became `ErrorState` (the exact pattern `ErrorState`'s
own doc comment names as the thing to replace); `/mistakes` and `/learn`'s
plain "nothing here" text became `EmptyState`. `Toast` is mounted once in
the root layout via a context provider, so any client component can call
`useToast().show(...)` without prop-drilling a toast setter down through
the tree — the teacher assignment form is the first real caller,
replacing a silent `router.refresh()` with actual confirmation.

`Tabs` and `Dropdown` are built and token-consistent but have no caller
yet — the app hasn't had a natural need for either. They're not wired in
just to prove they exist; the next feature that genuinely needs tabbed
content or a generic menu should use them.

## Analytics: real trends only, no fabricated history

`getAnalyticsOverview()` deliberately doesn't chart "mastery over time" —
the `Mastery` table stores a current score and a single `trend` delta, not
a time series (see `DATABASE.md`). Charting a fake mastery history would
mean inventing data points that never existed. What genuinely does have
history is every `Answer` row's `createdAt`, so `groupAnswersByDay()`
(pure function, tested independently of Prisma) buckets those into daily
accuracy and study-time trends for the last 14 days — real numbers,
smaller scope, rather than a more impressive-looking chart built on
invented history. If mastery-over-time is wanted later, it needs a real
schema addition (periodic mastery snapshots), not a workaround here.

## Search: category-specific authorization, not one blanket rule

`searchAll()` treats "who can see this result" differently per category
rather than applying a single access check to everything. Topics,
questions, and course material are shared course content — any
authenticated user's query searches all of it, the same way any student
can already browse any topic. Conversations are the one private category:
the query is always scoped `where: { userId }` regardless of what matches
the search term, so a title or message-content match on another student's
Nova conversation can never surface in search results. This mirrors the
same category-specific pattern used elsewhere (e.g. material deletion
authorization in `API.md`/`SECURITY.md`) rather than introducing a new
authorization model just for search.

ILIKE over a handful of columns was a deliberate scope decision, not an
oversight — the product spec lists semantic search as an explicit
"eventually," and this app already has the pgvector infrastructure RAG
uses if that's ever wanted for search too. Building it now would mean
embedding every topic/question/material name for marginal benefit over
substring matching on short, mostly-English titles.

## Dark mode: tokens, not a component-by-component retrofit

Every color in the app was already a design-system token (`ink`,
`paper`, `line`, `cobalt`, `signal`, `mastery-*`) rather than a raw
Tailwind palette class — a discipline followed from the very first
components built. That's what made dark mode a `globals.css` +
`tailwind.config.ts` change instead of a sweep through ~50 component
files adding `dark:` variants everywhere: the tokens became CSS custom
properties, redefined under `.dark`, and `tailwind.config.ts` was
updated to reference them via `rgb(var(--x) / <alpha-value>)` so every
existing opacity-modified usage (`text-ink/70`, `bg-ink/5`) kept working
unchanged.

Verified before considering this done, not assumed: grepped the whole
`src/` tree for hardcoded hex colors and default-Tailwind-palette classes
(`bg-gray-500` and similar) outside the token system. Two real
`bg-white` usages turned up (`SearchBar`'s expanded input, `TutorChat`'s
textarea) and were fixed to `bg-paper`. Recharts in `AnalyticsCharts.tsx`
was the one legitimate exception — it takes actual color values as props,
not classNames, so it can't pick up a CSS variable through Tailwind at
all; `hooks/useThemeColors.ts` reads the resolved CSS variable values at
render time and re-reads on a `MutationObserver`-detected class change,
so chart colors follow a live toggle rather than only updating after a
page reload.

The dark palette itself is a separate design pass, not an inversion —
see the doc comment at the top of `globals.css` for why hues shift
(cobalt lightens and gains a touch of saturation, for example) rather
than just flipping lightness values.

## Landing page routing: "/" needed its own auth rule, not an addition to the list-based one

`middleware.ts` already had a `PUBLIC_ROUTES` array matched via
`.startsWith()`, which works fine for routes like `/login` or
`/forgot-password` where no other route shares that prefix. `"/"` is
different — `"/dashboard".startsWith("/")` is `true`, so naively pushing
`"/"` onto that array would have made *every* route in the app register
as public, silently disabling the auth redirect entirely. `isPublicPath()`
special-cases `"/"` with an exact-match check instead, keeping the
existing list's `.startsWith()` behavior for everything else. This is the
kind of bug that a type checker and a casual review wouldn't catch —
it only shows up by tracing through what `.startsWith("/")` actually
evaluates to for other paths.

The mockups on the landing page (`components/landing/ProductMockups.tsx`)
reuse the literal classNames from the real Dashboard/Practice/Tutor
components they represent, not a separate "marketing illustration" style
— per the spec's explicit instruction, and consistent with this project's
running theme of visual components either being the real thing or not
existing at all.

## Observability: one chokepoint, not one call site per feature

`logAiCall()` is wired into exactly one place — `completeWithRetry()` in
`services/ai/factory.ts` — rather than into every route that happens to
call an AI provider. Since Nova, practice feedback, exam narratives,
question generation, planner rationale, and mistake mini-lessons all
already went through that one function (see the AI provider abstraction
section above), latency and success/failure logging for literally every
AI call in the app came from a single ~15-line change, not a sweep
through a dozen route files.

`logApiError()` is used more selectively, retrofitted into genuine
previously-silent failure paths found while building it — not sprinkled
everywhere for its own sake. Two real ones surfaced: a RAG chunk-embedding
failure in `embedAndStore.ts` that was a bare `catch {}` with no record
of what went wrong (one bad chunk was already designed not to abort the
whole upload, but "designed not to fail loudly" had quietly become
"never fails loudly, ever" for that specific error), and text-extraction
failures in `/api/materials/upload`, which return a client-facing `422`
but previously left no server-side trace of *why* extraction failed.

Scope boundary, stated plainly: this is logging, not a dashboard. Output
goes to stdout/stderr as structured JSON, which every major host captures
automatically — see `DEPLOYMENT.md` for what aggregating that into charts
or alerts would need on top of this. The Admin Dashboard's "AI usage"
section still shows the DB-derived proxy described earlier in this file,
not a live view of these logs; wiring that up is real follow-up work,
not something this change silently already did.

## Not yet integrated

An admin-specific view (the `requireRole` helper already accepts `ADMIN`
everywhere the teacher dashboard uses it) is scaffolded but not built out.
It's additive on top of this foundation, not a redesign of it.
