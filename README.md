# EduVanta AI

> "Your AI knows what you should learn next."

An AI-native learning platform built around **Learning Intelligence**: a
continuously-updated model of what a student actually understands — not
just what they've clicked through.

Traditional LMS: `Course → Content → Test → Score`
EduVanta: `Learn → Practice → Understand mistakes → Measure mastery → Adapt → Improve`

## What's implemented in this pass

This repository is a **real, runnable foundation** — not a mockup. Wired
end-to-end and integrated with each other:

**Backend / services**
- ✅ Full Postgres schema (Prisma) — 20+ models, proper relations & indexes
- ✅ AI provider abstraction (`services/ai/`) — Anthropic / OpenAI / Gemini,
  switchable via `AI_PROVIDER` env var, with a clearly-labeled mock fallback
  for local dev with no keys
- ✅ `buildStudentLearningContext()` — the narrow, privacy-conscious context
  layer every AI feature reads from
- ✅ Nova AI Tutor chat API (`/api/tutor/chat`) — context-aware, persists
  conversation history, handles AI failures without losing the user's message
- ✅ Adaptive Practice Engine (`/api/practice/next`, `/api/practice/submit`)
  — real difficulty-ladder logic (correct+fast → harder, repeated same-concept
  miss → easier + teach), server-side answer checking, AI mistake analysis
  validated with Zod before it touches the database
- ✅ Mastery Engine — accuracy + recency decay + difficulty weighting +
  consistency penalty + repeated-mistake penalty (see
  `services/mastery/calculateMastery.ts`), not `correct/total`
- ✅ Mistake Vault persistence with occurrence tracking
- ✅ Seed script with clearly-tagged `[demo]` data
- ✅ Unit tests for both algorithms + AI response validation (logic manually
  verified with plain Node in the sandbox since `npm install` has no network
  access here — run `npm test` yourself to execute the real suite)

**Frontend**
- ✅ Responsive app shell — sidebar (desktop) / bottom nav (mobile), per spec
- ✅ Dashboard — greeting, today's plan (real `StudySession` data), learning
  intelligence stats, AI recommendations — all server-rendered from Postgres,
  zero hardcoded numbers
- ✅ Adaptive practice session UI — live against `/api/practice/next` +
  `/api/practice/submit`; shows real difficulty label, Nova's feedback,
  and the reason the difficulty changed
- ✅ Nova tutor chat UI — live against `/api/tutor/chat`; suggested actions,
  failure state with retry that doesn't duplicate the message
- ✅ Study planner — generation algorithm (`services/planner/`) prioritizes
  weak/unattempted topics over strong ones, spaces in periodic revision,
  and rebalances missed sessions by priority (protects weak topics first,
  drops lowest-priority make-up work rather than overloading every
  remaining day) instead of pushing a backlog forward forever; plan UI +
  rebalance action wired to real `StudyPlan`/`StudySession` rows
- ✅ Onboarding — 7-step wizard (`/onboarding`) per spec, one question per
  screen with a progress bar rather than a form dump; on completion it
  saves the `Profile` and generates the student's *first* study plan
  directly from the same `generateStudyPlan()` algorithm the planner page
  uses — self-learners with no fixed exam date get a rolling 30-day starter
  plan instead of being unable to onboard at all. Dashboard/`/` redirect
  here automatically until `Profile.onboardedAt` is set. Onboarding also
  auto-enrolls the student in every course their chosen subjects belong
  to (`Enrollment` model), which now powers a real `/learn` — enrolled
  courses with per-topic mastery badges, not a placeholder page.
- ✅ Exam Simulator — timer, question navigator grid, mark-for-review,
  previous/next, auto-save on every answer, submit confirmation, and an
  AI report answering "what actually cost you marks." Score, topic/
  difficulty breakdowns, and the costly-question categories (guessed too
  fast, missed a flagged-unsure question, correct-but-slow) are all
  computed deterministically (`services/exam/scoreExam.ts`); the AI only
  narrates those numbers, never invents them. Reuses the same
  `Attempt`/`Answer` tables as adaptive practice via a new
  `Attempt.examAttemptId` link, so exam performance isn't a separate data
  silo. Resuming after a refresh restores saved answers, marks, and the
  countdown from the server-stored deadline.
- ✅ Auth — real Supabase Auth via `@supabase/ssr` (not the deprecated
  `auth-helpers-nextjs`): signup, login, logout, forgot/reset password,
  email verification callback, and middleware-based session refresh +
  route protection. `getCurrentUser()` auto-provisions a `User` row on a
  student's first authenticated request. Login never reveals whether an
  email is registered (generic error message; forgot-password always
  shows the same confirmation) — see SECURITY notes in ARCHITECTURE.md.
- ✅ Teacher Dashboard — class-wide mastery aggregated per topic across all
  students (`services/teacher/`), weak-topic detection (flags a topic only
  when a majority of a large-enough group is struggling — not one student
  having a bad day), an AI insight card with a working "Generate Remedial
  Practice" button that runs the full AI question-generation pipeline
  (generate → validate → one correction attempt → discard-if-still-invalid
  → persist as `Question` rows), and assignment creation scoped to courses
  the teacher actually owns.
- ✅ RAG / course material — full pipeline: upload (PDF via `pdf-parse`, or
  plain text/markdown) → sentence-aware chunking with overlap
  (`services/rag/chunkText.ts`) → embedding → pgvector storage via raw SQL
  (Prisma has no native vector type) → cosine-similarity retrieval filtered
  by topic and a minimum-relevance threshold, so marginally-related chunks
  never get forced into context. Nova's tutor chat retrieves relevant
  material for the current topic before answering, is instructed to prefer
  it when relevant and cite it by file name, and is explicitly told never
  to cite anything beyond what was actually retrieved. Embeddings run
  through OpenAI specifically (see setup note below) regardless of which
  provider handles chat.
- ✅ Mistake Vault — unresolved mistakes grouped by concept with occurrence
  counts; once a mistake recurs 3+ times, "Let's fix it" generates a short
  AI mini-lesson addressing the student's *specific* recurring error (not
  a generic definition, with a template fallback if the AI call fails)
  plus 5 new practice questions for that concept — reusing the exact same
  generate → validate → correct-once → discard-if-invalid pipeline the
  teacher dashboard's remedial practice uses. One question-generation
  pipeline in the codebase, two triggers.
- ✅ Exam Readiness — reworked from a flat formula into a proper
  calculation (`services/dashboard/calculateExamReadiness.ts`): average
  topic-level mastery minus a capped penalty for unresolved mistakes, plus
  the Strong/Developing/Weak per-topic breakdown the product spec's
  dashboard mock shows, reusing the mastery engine's existing bands rather
  than inventing a second taxonomy. Still explicitly labeled as an
  internal indicator, not a guarantee.
- ✅ Rate limiting — every AI-calling route (`tutor/chat`,
  `practice/submit`, `exam/submit`, `teacher/remedial-practice`,
  `mistakes/fix`, `planner/generate`, `onboarding/complete`) is capped by a
  per-user sliding-window limiter (`services/security/rateLimit.ts`) sized
  to how expensive that route actually is — a chat message (20/5min) vs. a
  5-question generation job (10/hour). In-memory and per-instance for now;
  see the doc comment in `rateLimit.ts` for the one-line change needed to
  swap in Redis for a multi-instance deployment.
- ✅ Admin Dashboard (`/admin`, ADMIN-only) — user counts by role, recent
  signups, content counts (courses/questions/exams, AI-generated vs.
  human-authored), an AI-usage view (honestly labeled as DB-derived counts,
  not live call tracking — that needs the Observability work below), and
  a system-health panel built from `LearningMaterial` processing status.
  Also surfaces a genuine health signal: a count of questions that exist
  without `validated: true`, which should always read zero given the
  generation pipeline never persists an invalid question — a non-zero
  count means something bypassed it.
- ✅ Focus Mode (`/focus`) — a distraction-free timer wrapper around the
  *same* `PracticeSession` component adaptive practice already uses (one
  non-breaking prop added — `onAnswered` — no duplicated question/submit
  logic). Ends on timer expiry or manual end, then shows a real summary
  (time, questions, accuracy, the topic's current mastery + trend, and the
  student's top active recommendation if any) pulled from the same
  Attempt/Answer/Mastery data every other view already uses.
- ✅ Streaks + Notifications — real daily-streak tracking
  (`services/gamification/updateStreak.ts`, a pure day-boundary
  calculation) wired into both practice and exam submission; a streak
  notification fires on genuine extensions and new personal bests, never
  on a same-day repeat. A study-session reminder fires when the dashboard
  loads and finds pending sessions for today. Both go through a shared
  dedup helper (`createNotificationIfNotDuplicate`) so "do not spam users"
  is enforced in one place rather than per-trigger. A bell icon with an
  unread badge and dropdown lives in a slim top bar in `AppShell` — not a
  6th bottom-nav icon, keeping the mobile nav at the spec's 5 items.
  **Honest limitation**: reminders are reactive (fire when a relevant page
  loads), not proactive push notifications — there's no background job
  scheduler in this stack yet, so a student who never opens the app that
  day won't get reminded. Assignment-due and exam-date reminders still
  aren't implemented — the `Enrollment` model added below now makes this
  answerable, but the notification triggers themselves aren't wired to
  it yet (see ARCHITECTURE.md).
- ✅ Gamification (Achievements) — real milestones, not points for
  clicking: a streak-record achievement (reusing the same `isNewRecord`
  signal the streak notification uses), a mastery-milestone achievement
  the moment a topic/concept first reaches `MASTERED` (not on every
  re-check, not for lesser bands), and an exam personal-best achievement
  that deliberately requires an actual prior score to beat — a first-ever
  exam attempt doesn't trivially "beat" nothing. All three are pure,
  tested functions (`services/gamification/checkAchievements.ts`) fed by
  data the mastery/streak/exam code already computes, wired into
  `practice/submit` and `exam/submit`. Shown on `/profile` alongside
  current/longest streak.
- ✅ Original design system tokens — warm-neutral paper/ink base, cobalt for
  structure, amber reserved *only* for AI/Nova moments, Newsreader + IBM Plex
  Sans type pairing (deliberately not the cream+serif+terracotta or
  black+neon defaults)
- ✅ Component library — `Modal` (portaled, focus-on-open, Escape-to-close),
  `Tabs`, `Dropdown`, `Toast` (context-based, mounted once in the root
  layout, usable from anywhere via `useToast()`), `Skeleton`/`SkeletonList`,
  `EmptyState`, `ErrorState` — each retrofitted into a real page rather
  than left unused: the exam submit-confirmation dialog and
  `PracticeSession`'s error view (both previously bespoke inline markup)
  now use `Modal` and `ErrorState`; `/mistakes` and `/learn` use
  `EmptyState`; the teacher assignment form confirms success with a toast
  instead of a silent `router.refresh()`.
- ✅ Analytics page (`/analytics`) — real accuracy and study-time trends
  over the last 14 days, charted from actual `Answer.createdAt` timestamps
  (Recharts, already a dependency), plus a mastery-by-topic bar chart and
  a weak-areas list. Deliberately does *not* chart "mastery over time" —
  the `Mastery` table only stores a current score, not historical
  snapshots (see `DATABASE.md`), so a mastery trend line would have to be
  fabricated; the accuracy/study-time trends shown instead are the real
  history that does exist.
- ✅ Global search — topics, questions, course material, and (privately
  scoped) Nova conversations, via Postgres `ILIKE` — not semantic search,
  which the product spec explicitly marks as an "eventually," not a v1
  requirement. Search-bar icon lives in the same top-bar slot as the
  notification bell (not a 6th/7th bottom-nav icon). Authorization is
  category-specific rather than one blanket rule: topics/questions/
  materials are shared course content searchable by anyone, but
  conversations are always scoped to `userId` — search can never surface
  another student's chat with Nova, even by an exact title match.
- ✅ Dark mode — a genuinely separate dark palette (`globals.css`), not a
  CSS `invert()` or a mechanical lightness-flip of the light one; hues
  shift (cobalt gets lighter and a touch more saturated, for example)
  because a color legible on a light background often reads muddy on a
  dark one at the same saturation. Colors are CSS custom properties that
  `tailwind.config.ts` references via `rgb(var(--x) / <alpha-value>)`, so
  every existing `bg-paper`/`text-ink/70`/`border-signal/30` usage across
  ~50 files respects dark mode automatically — no component needed a
  `dark:` variant added by hand, *because* the app consistently used only
  the design-system tokens everywhere already (verified: zero hardcoded
  Tailwind default-palette or hex-color usages found outside this token
  system when this was built). The one real exception was Recharts in
  `AnalyticsCharts.tsx`, which takes actual color values rather than
  classNames — `hooks/useThemeColors.ts` reads the live CSS variables via
  `getComputedStyle` and watches for the `dark` class changing via
  `MutationObserver`, so chart colors update on a live toggle too.
  Preference persists via a cookie read server-side in `layout.tsx`
  (avoids a flash of the wrong theme on load) rather than `localStorage`
  alone. Toggle lives in the same top bar as search/notifications.
- ✅ Landing page (`/`) — the spec's exact hero copy ("Meet the AI that
  learns how you learn." / "Personalized practice, intelligent feedback,
  and a study plan that adapts to you."), a "Start Learning" CTA to
  `/signup`, and six feature sections (AI Tutor, Adaptive Practice,
  Learning Intelligence, Mistake Intelligence, Exam Readiness, Study
  Planner) — each illustrated with a small mockup built from the *same*
  classNames/tokens the real pages use (`components/landing/
  ProductMockups.tsx`), not generic stock-style illustrations, per the
  spec's explicit instruction to show actual product UI. Middleware now
  treats `/` as public (previously it redirected unconditionally to
  `/dashboard`, which meant `/login` for anyone logged out) and redirects
  an already-authenticated visitor straight to `/dashboard` before this
  page ever renders — worth noting since `PUBLIC_ROUTES` elsewhere is
  matched via `.startsWith()`, where adding `"/"` naively would have
  matched every route in the app and silently disabled auth gating
  entirely; `/` gets its own exact-match check instead
  (`isPublicPath()` in `middleware.ts`).
- ✅ Observability — structured JSON logging (`services/observability/
  logger.ts`) to `console.log`/`console.error`, captured automatically by
  any host's default log pipeline (Vercel included) rather than requiring
  a third-party service to be configured. `completeWithRetry()` — the
  single chokepoint every AI-calling feature in the app passes through —
  logs latency and success/failure for every AI call project-wide from
  one integration point, not per-caller. `logApiError()` is wired into
  genuine previously-silent failure paths found while building this: a
  RAG chunk-embedding failure that used to fail silently (`catch {}` with
  no logging) in `embedAndStore.ts`, and material-upload text-extraction
  failures in `/api/materials/upload`. Never logs message content or PII
  — see the field allowlist in `logger.ts`. **Scope boundary**: this is
  logging, not a dashboard — nothing in the admin UI visualizes these
  logs yet (the Admin Dashboard's "AI usage" section remains the
  DB-derived proxy described above); aggregating/querying structured logs
  into a chart is real follow-up work, not done here.

## Status

This started as one deep vertical slice (auth → context → tutor + adaptive
practice → mastery → mistakes) rather than a wide layer of disconnected
screens, and grew from there, one integrated feature at a time, until
every major section of the original spec is now wired end-to-end against
the real schema below. That history is still worth knowing, because it's
why the codebase reads the way it does: every feature reuses an existing
service or pattern (the AI-narrates-a-deterministic-result approach, the
generate→validate→correct-once question pipeline, the category-specific
authorization model) rather than each screen inventing its own.

What genuinely remains, not glossed over:

- **Never run for real.** Built and manually logic-checked in a sandbox
  with no network access — `npm install` has never actually completed
  here, so the app has never been started against a live Postgres,
  Supabase project, or AI provider. Run it yourself before trusting it
  (see Setup below). Several real bugs were only caught by tracing logic
  by hand rather than by the tests actually running — see `ARCHITECTURE.md`
  for the specific ones found this way.
- **Tests are written, not executed.** Every algorithm has a Vitest suite,
  but `npm test` has never actually run in this environment — run it for
  real before relying on it.
- A handful of smaller, explicitly-scoped gaps accumulated along the way
  rather than being missed: `Tabs`/`Dropdown` components exist with no
  caller yet; assignment-due/exam-date notification triggers aren't wired
  to the `Enrollment` model that now exists; rate limiting is in-memory
  (needs Redis for multi-instance deployments); the Admin Dashboard's
  "AI usage" is a DB-derived proxy, not live call tracking (Observability
  now logs real AI latency/errors, but nothing visualizes those logs in
  the UI yet); "mastery over time" isn't charted because the schema has
  no historical mastery snapshots, only a current score; there's no
  background job scheduler, so notification reminders are reactive, not
  proactive; deeper per-topic pages (concept summaries, examples) and a
  course catalog/join-flow beyond onboarding auto-enrollment aren't
  built; AI question generation only produces MCQs, not the other 5
  types the spec lists.

Full breakdown, feature by feature:

| Area | Status |
|---|---|
| Auth (Supabase) | ✅ Real signup/login/logout/forgot-reset/email verification + middleware; needs a configured Supabase project to run |
| Nova tutor | ✅ API + chat UI, fully wired |
| Adaptive practice | ✅ API + algorithm + session UI, fully wired |
| Mastery engine | ✅ Algorithm wired into dashboard stats and practice topic list |
| Study planner | ✅ Generation + rebalancing algorithms, API routes, and UI fully wired |
| Onboarding | ✅ 7-step wizard, saves profile, generates first plan |
| Exam Simulator | ✅ Timer, navigator, auto-save, AI report — fully wired |
| Teacher Dashboard | ✅ Class analytics, weak-topic detection, AI question generation, assignments |
| RAG / course material | ✅ Upload → chunk → embed → pgvector retrieval → Nova, fully wired |
| Mistake Vault | ✅ Grouped-by-concept list, "Let's fix it" (mini lesson + 5 AI-generated questions) once a mistake recurs 3+ times |
| Exam Readiness | ✅ Real calculation + Strong/Developing/Weak topic breakdown on the dashboard, not a placeholder formula |
| Rate limiting | ✅ Per-user sliding-window limits on every AI-calling route (in-memory; needs Redis for multi-instance prod) |
| Admin Dashboard | ✅ Users, content, AI-usage proxy, system health — real queries, honestly labeled where it's a proxy |
| Focus Mode | ✅ Timer wrapper reusing `PracticeSession`, real end-of-session summary |
| Streaks + Notifications | ✅ Real streak tracking + dedup'd notifications (reactive, not push — see honest limitation in features list above) |
| Gamification (Achievements) | ✅ Real milestones (streak records, first-time mastery, exam personal bests), deduped, no points-for-clicking |
| Dashboard | ✅ Real data, no hardcoded numbers |
| Course browsing (`/learn`) | ✅ Real enrolled-course list with mastery badges per topic, linking into practice — course *catalog*/join-new-course browsing still not built |
| Enrollment | ✅ Real model, auto-enrolled at onboarding based on selected subjects; powers `/learn` and the teacher dashboard's real roster count |
| Documentation | ✅ `DATABASE.md`, `API.md`, `SECURITY.md`, `DEPLOYMENT.md` added, matching this README's level of specificity |
| Design system components | ✅ Modal, Toast, EmptyState, ErrorState retrofitted into real usages; Skeleton ready; Tabs/Dropdown built and token-consistent but have no caller yet |
| Analytics page | ✅ Real accuracy/study-time trends (14-day), mastery by topic, weak areas — no fabricated history |
| Search | ✅ ILIKE-based across topics/questions/materials/conversations, category-specific authorization; semantic search intentionally deferred |
| Dark mode | ✅ Real separate palette via CSS variables, not inverted; persists via cookie, chart colors update live too |
| Landing page | ✅ Spec's exact hero copy, real product UI mockups (not generic illustrations), `/` now public with correct auth redirects |
| Observability | ✅ Structured JSON logging (AI latency/errors via one chokepoint, plus previously-silent RAG/upload failures) — logging only, no admin-UI dashboard for it yet |

## Setup

```bash
cp .env.example .env       # fill in DATABASE_URL, Supabase keys, and at least one AI key
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

**Auth setup**: create a Supabase project, copy its URL/anon key into
`.env`, and in the Supabase dashboard enable Email auth (Authentication →
Providers → Email). The seed script's demo user is a Prisma-only row for
quick DB inspection — to actually log in, sign up through the app at
`/signup`; `getCurrentUser()` auto-provisions the matching `User` row on
first authenticated request, so there's no separate "link your account"
step.

**RAG setup**: your Postgres instance needs the `pgvector` extension
enabled once — `CREATE EXTENSION IF NOT EXISTS vector;` — before running
migrations (Supabase's Postgres has it available to enable from the
dashboard's Database → Extensions page). Embeddings specifically require
`OPENAI_API_KEY` even if `AI_PROVIDER` is set to anthropic or gemini for
chat, since this app's Anthropic/Gemini providers don't implement an
embeddings API.

Without any AI key set, `AI_PROVIDER` falls back to a mock provider in
development so the app still runs — see `services/ai/providers/mock.ts`.
In production, a missing key throws loudly instead of silently faking output.

## Project structure

```
src/
  app/api/          API routes (tutor chat, practice, planner, exam, auth)
  app/(pages)/       onboarding, dashboard, practice, tutor, planner, exam,
                      login/signup/forgot-password/reset-password
  middleware.ts       session refresh + protected-route gate
  lib/supabase/       browser + server Supabase clients (@supabase/ssr)
  lib/auth.ts          getCurrentUser() — Supabase session -> Prisma User
  services/ai/         provider abstraction, context builder, validation
  services/mastery/    mastery scoring algorithm
  services/practice/   adaptive difficulty algorithm
  services/planner/    study plan generation + rebalancing
  services/exam/       exam scoring/analysis + AI report narrative
  db/                  Prisma client singleton
prisma/
  schema.prisma        full data model
  seed.ts              demo data
```

See `ARCHITECTURE.md` for how the pieces integrate, `DATABASE.md` for the
data model and its one known gap (no enrollment relation), `API.md` for
every route, `SECURITY.md` for the auth/authorization/rate-limiting model
and what's not hardened yet, and `DEPLOYMENT.md` for going to production.
