# EduVanta Phase 3

This pass focuses on making the existing product safer and more useful without rewriting it or changing Nova's core implementation.

## Included

- Private learning-material visibility: material lists, search, and Nova RAG retrieval are scoped to the uploader.
- Safer material upload validation and error handling.
- Practice submission replay protection so network retries cannot re-run AI feedback, mastery, streak, notification, and achievement side effects.
- Fixed repeated-mistake counting for topic/subtopic mastery; the previous implementation could pass unsupported fields to Prisma.
- Planner now weights unresolved mistakes by the topic of their concept instead of applying one global mistake signal to every topic.
- Course-linked exams now require student enrollment before starting.
- Dashboard now surfaces upcoming assignments from enrolled courses.
- Search rejects excessively long queries and keeps private material scoped to the current user.

## Verification

Run in the project directory:

```bash
npm install
npm run db:generate
npm run lint
npm test
npm run build
```

No production secrets are included.
