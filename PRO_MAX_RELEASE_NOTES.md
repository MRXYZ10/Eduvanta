# EduVanta — Pro Max pass

This release is based on `Eduvanta-ULTIMATE-UI` and keeps the existing Supabase/Prisma data model intact.

## What changed

- Adaptive practice now keeps the full adaptive state returned by the server, so streaks of correct/wrong answers actually influence the next difficulty.
- Practice sessions use a rolling recent-question window instead of resetting the visible question counter, so sessions can continue indefinitely without sending an ever-growing exclusion list.
- Added keyboard controls: `1–4` selects an answer and `Enter` submits/continues.
- End-session navigation now uses Next.js client navigation instead of a full browser reload.
- Built-in Functions, Relations and Sets question banks now target **1,000 validated MCQs per topic**, with deterministic parameter variation rather than only a handful of repeated textbook questions.
- Question-bank creation uses bulk database inserts for questions/options, avoiding hundreds of individual insert calls during warm-up.
- Added a `db:fill-bank` command to warm all currently supported built-in topics in one pass.
- Added practice/analytics database indexes for topic+difficulty lookup, attempt history and unresolved concept mistakes.
- Reduced unnecessary production console logging from auth and Nova streaming performance probes.
- Refined buttons, focus states, hover behavior, mobile interaction, backdrop blur and motion for a lighter, smoother UI.
- Removed stale backup source files and the old generated TypeScript error dump.

## Database safety

No destructive reset is included. The performance migration only adds indexes with `IF NOT EXISTS`.

For an already-populated database, apply the migration through your normal Prisma deployment flow before production. Do not run `migrate reset`.
