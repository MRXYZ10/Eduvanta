# Phase 7 — Product functionality + adaptive practice reliability

## What changed

- Practice topics are now filtered to courses the signed-in student is actually enrolled in (staff can still preview all topics).
- Exams shown in the practice hub are scoped to the student's enrolled courses, while course-less exams remain visible.
- Adaptive practice no longer dead-ends when a topic has no questions at the exact requested difficulty. It falls back to the nearest available difficulty and tells the student why.
- When the entire seen pool is exhausted, practice can recycle a validated topic question instead of showing a dead-end.
- Practice keeps its adaptive state aligned with the difficulty that was actually served.
- Empty question banks now have a clear, actionable message instead of a misleading generic error.
- Removed misleading references to Nova from generic practice grading/network errors.
- Practice UI now shows the course alongside each topic.

## Verification

Run locally:

```powershell
npm install
npx prisma generate
npm run lint
npm run build
npm run dev
```

Then test: Practice hub -> enrolled topic -> answer -> next question -> difficulty changes -> exhausted question pool.
