# EduVanta — Phase 4 Notes

Phase 4 focuses on production UX/reliability and mobile quality while preserving the existing architecture and leaving Nova's core implementation alone.

## Changes

### Practice session reliability
- A recent unfinished practice attempt (within two hours) is reused on refresh/back navigation instead of creating abandoned attempt rows on every render.

### Exam runner reliability
- Unsaved exam answers are tracked locally and retried before submission.
- Pending answers are flushed when the tab becomes hidden.
- Exam submission refuses to proceed when a pending answer could not be persisted.
- Mark-for-review changes are also persisted for already-answered questions.
- Question navigation controls use larger mobile-friendly touch targets.

### Mobile/PWA polish
- Added an explicit Next.js viewport definition with device width, initial scale, and safe-area support.

## Verification

Run from the project root:

```bash
npm ci
npm run db:generate
npm run lint
npm test
npm run build
```

Then verify manually on a phone:

1. Refresh an in-progress practice topic and confirm it resumes the same recent attempt.
2. Start an exam, answer questions, briefly switch apps/tabs, return, and submit.
3. Simulate a temporary network failure while saving an exam answer; confirm submission retries the pending answer.
4. Verify mark-for-review state survives navigation.
5. Test the exam question navigator with touch on a narrow viewport.
