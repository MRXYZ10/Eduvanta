# Database

PostgreSQL via Prisma. Full schema: `prisma/schema.prisma`. This doc
explains the *shape* of the data model and the decisions behind it —
read the schema file itself for exact field types.

## Setup

1. A Postgres instance with the `pgvector` extension available (Supabase's
   Postgres has this — enable it once from Database → Extensions, or run
   `CREATE EXTENSION IF NOT EXISTS vector;` directly).
2. `DATABASE_URL` in `.env` pointing at it.
3. `npm run db:generate` (Prisma Client) → `npm run db:migrate` (creates
   tables) → `npm run db:seed` (demo data, see below).

## Model groups

**Identity**: `User`, `Profile`, `ParentLink` (placeholder join table so a
`PARENT` role can be added later with zero migration churn — nothing
currently creates rows here).

**Content hierarchy**: `Course` → `Subject` → `Topic` → `Subtopic`, plus
`Concept` (topic-scoped, finer-grained than a subtopic — this is what
mastery is actually tracked against). `Question` can attach to a topic,
subtopic, or concept depending on how specific it is.

**Practice/exam data**: `Attempt` is the umbrella "one sitting" model for
practice, focus-mode, *and* exam sessions (`mode: "practice" | "focus" |
"exam"`) — all three write to the same `Answer` table rather than each
having its own. An exam-mode `Attempt` links to an `ExamAttempt` via
`Attempt.examAttemptId`, which is where exam-specific fields (score, the
JSON report) live. `ExamQuestion` is the join table fixing an exam's exact
question set and order, since adaptive practice picks questions on the fly
but an exam needs a stable set.

**Mastery**: one `Mastery` row per `(userId, scope)` where scope is
exactly one of `topicId` / `subtopicId` / `conceptId` (the other two are
null) — see `services/mastery/calculateMastery.ts` for the scoring
algorithm itself, this file just holds the result.

**Mistakes**: `Mistake` rows track a `(userId, questionId)` pair with an
`occurrences` counter that increments on repeat, rather than creating a
new row per repeat — see `services/mistakes/`.

**Planning**: `StudyPlan` has many `StudySession` rows (denormalized —
`topicLabel` is a display string, not a foreign key, since a session like
"Revise: Functions" doesn't need to resolve back to a topic for the
planner's own logic to work).

**RAG**: `LearningMaterial` (one row per uploaded file) has many
`LearningMaterialChunk` rows, each with an `embedding` column declared as
`Unsupported("vector")` — Prisma Client has no native pgvector type yet,
so both writing and querying that column go through raw SQL (see
`services/rag/embedAndStore.ts` and `retrieveRelevantChunks.ts`). Don't
try to read/write `.embedding` through the normal Prisma Client API — it
isn't exposed there by design.

**Gamification/notifications**: `Streak` (one row per user, updated by
`services/gamification/recordStreakActivity.ts`), `Achievement` (append-only,
deduped by `(userId, type, label)` — see `awardAchievement.ts`),
`Notification` (deduped by `(userId, type, title)` within a rolling window
— see `createNotificationIfNotDuplicate.ts`).

## Enrollment

`Enrollment { userId, courseId, enrolledAt }`, unique on `(userId,
courseId)`. This used to be a documented schema gap (there was no way to
know which students were in which course) — it's filled now, but the
history is worth knowing:

- **How enrollment happens**: `/api/onboarding/complete` auto-enrolls a
  student in every course their selected subjects belong to, derived from
  `Subject.courseId` (`createMany` with `skipDuplicates`, so re-running
  onboarding is safe). There's no separate "browse and enroll" flow yet —
  `/learn` shows a student's enrolled courses, it doesn't offer to join
  new ones.
- **What it unblocked**: the teacher dashboard now shows a real
  `enrolledStudentCount` (distinct students across `Enrollment` rows on
  the teacher's courses) alongside the existing mastery-derived class
  analytics — the two are shown side by side deliberately, since they can
  legitimately diverge (an enrolled student who hasn't practiced yet has
  no `Mastery` row, so they count toward the roster but not toward
  per-topic stats).
- **What's still open**: assignment-due and exam-date reminders still
  aren't implemented — `Enrollment` tells you who's in a course, but
  `Assignment` and `Exam` aren't yet scoped to specific enrolled students
  in a way that's wired into the notification triggers. That's now a
  smaller, well-defined follow-up rather than a missing foundational
  model.

## Indexes

Every foreign key has a matching `@@index` (see the schema — Prisma
doesn't add these automatically for you, they're explicit). The
less-obvious ones: `Question` is indexed on `difficulty` (the adaptive
practice engine filters by it on every question fetch), and `Mastery` is
indexed on `userId` alone in addition to its compound unique constraint
(the dashboard and teacher analytics both do "all of this user's mastery"
scans that don't care about scope).

## Migrations

Standard Prisma flow: edit `schema.prisma`, run
`npx prisma migrate dev --name <description>` locally (creates a
migration file + applies it), commit the generated migration under
`prisma/migrations/`. For production, `npx prisma migrate deploy` applies
pending migrations without prompting — wire that into your deploy step
(see `DEPLOYMENT.md`).

## Seed data

`prisma/seed.ts` creates a demo student, teacher, admin, a course with a
few topics/concepts/questions, a study plan, an exam, and enough
classmates-with-mastery-data to make the teacher dashboard's weak-topic
detection demonstrable (it requires 3+ students by default). Every seeded
record's display text is tagged `[demo]` so it's never mistaken for real
content in a shared environment. Re-running `npm run db:seed` is safe —
every create uses `upsert` keyed on a stable identifier (email for users)
where a duplicate run would otherwise conflict.
