# EduVanta implementation pass

This pass adds production-oriented functionality without rewriting Nova or the existing architecture.

## Added

- Course catalog browsing at `/learn/catalog`.
- Student self-enrollment through `/api/courses/enroll` with server-side authentication and idempotent enrollment.
- Real mastery history snapshots via `MasterySnapshot` and a new analytics chart.
- A protected daily notification cron at `/api/cron/notifications` for assignments due within 24 hours and upcoming pending study sessions.
- Vercel cron configuration in `vercel.json`.
- `CRON_SECRET` environment variable documentation.

## Verification limitation

The uploaded archive could not be fully installed in the execution environment: dependency installation timed out and the resulting `node_modules` tree was incomplete. Therefore a full TypeScript/lint/production-build run could not be honestly claimed. Before deployment, run `npm ci`, `npx prisma generate`, `npm test`, `npm run lint`, and `npm run build` with the real environment variables configured.
