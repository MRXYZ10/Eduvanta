# EduVanta — Enhancement Pass 2

This pass focuses on correctness, security, reliability, and mobile/perceived performance without redesigning Nova.

## Changes

- Practice submissions are now idempotent via `upsert`, reducing duplicate-answer failures from double taps/retries.
- Practice submissions reject finished sessions and reject questions outside the session's topic.
- The practice AI feedback request no longer sends the authoritative `correctAnswer` to the AI provider. Correctness remains server-side.
- Exam answer autosave now verifies that the question actually belongs to the current exam.
- Exam submission now atomically claims an unfinished attempt before awarding streaks/achievements, reducing duplicate awards from concurrent/retried submissions.
- Mastery-history chart grouping changed from repeated `.find()` scans to a single-pass map, reducing client-side work as history grows.
- Added a global route loading skeleton for better perceived performance.
- Added a global recoverable error UI that avoids exposing server error details to users.

## Verification note

The container did not have the project's installed dependencies. `npm install --ignore-scripts` timed out, so the full Next.js build/test suite could not be executed here. A global TypeScript check also stopped at missing dependency type definitions. Run locally/Vercel:

```bash
npm install
npm run db:generate
npm run lint
npm test
npm run build
```
