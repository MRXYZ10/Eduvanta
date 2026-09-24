# EduVanta Phase 6

## Focus
Final production-hardening pass: access control, security headers, practice endpoint integrity, and deployment health visibility.

## Changes
- Added `src/lib/topic-access.ts` to centralize course-enrollment checks for topic practice.
- Student practice session creation now requires enrollment in the topic's course.
- Student practice question retrieval now requires enrollment in the topic's course.
- Practice submission explicitly rejects non-practice attempts at this endpoint.
- Added baseline security response headers in `next.config.js`.
- Added `GET /api/health` for a safe database-backed deployment health check.
- Nova core implementation was not rewritten.

## Verification
Run locally:

```bash
npm ci
npm run db:generate
npm run lint
npm test
npm run build
```

Then verify:

- `/api/health` returns `ok: true` with a configured database.
- A student enrolled in a course can start/practice its topics.
- A student not enrolled in the course receives HTTP 403 for those practice APIs.
- Teacher/admin preview access remains available.
