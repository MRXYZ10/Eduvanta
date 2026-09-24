# EduVanta Final Release Pass

This build focuses on the actual learner experience rather than only backend hardening.

## Major improvements

- Premium responsive application shell with active navigation and smoother interactions.
- Mobile-friendly navigation and touch targets.
- Learning Hub now opens real topic lesson pages with core ideas, examples, checklists, concepts and a direct adaptive-quiz action.
- Built-in curriculum topics receive curated validated question banks automatically on first practice visit.
- 10-question adaptive practice sessions with progress, difficulty feedback and completion summary.
- Practice questions fall back gracefully across difficulty levels instead of dead-ending on sparse banks.
- Fixed a critical practice submission bug where normal `practice` attempts were incorrectly rejected by the submit API.
- Protected direct topic access for learners.
- Existing mastery, mistakes, streak and analytics flows continue to be updated by practice submissions.
- Nova was intentionally not redesigned.

## Built-in question coverage

The included demo curriculum has 10 curated questions each for:

- Functions
- Relations
- Sets

For additional courses/topics, publish validated questions or connect an approved content-generation workflow; this release does not fabricate generic academic questions for unknown topics.

## Local setup

1. Copy `.env.example` to `.env`.
2. Put the existing working Supabase/Postgres connection values into `.env`.
3. Do not commit `.env` or expose secrets.
4. Run:

```bash
npm install
npx prisma generate
npm run dev
```

Open `http://localhost:3000`.

Do not run `prisma db push` or `prisma migrate reset` against an existing production database unless the schema change has been reviewed first.

## Unlimited Practice Update

- Built-in Functions, Relations, and Sets practice banks now expand to a large 300-question validated pool per supported topic.
- Practice sessions are no longer capped at 10 questions; learners can continue until they choose **End session**.
- When a topic's stored pool is exhausted, the practice API can generate and validate fresh MCQs on demand when a real AI provider is configured.
- If no AI provider is configured, the app safely recycles validated questions rather than dead-ending the learner.
- Prisma 5.22.0 is pinned consistently in package metadata.
- `npx prisma db seed` is now configured to use the existing `tsx prisma/seed.ts` script.
- `.env.example` documents both `DATABASE_URL` and `DIRECT_URL`.
