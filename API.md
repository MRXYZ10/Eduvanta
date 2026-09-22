# API Reference

All routes are Next.js Route Handlers under `src/app/api/`. Every route
(except `auth/logout`) calls `getCurrentUser()` first and returns `401`
if there's no session — that check is omitted from each entry below to
avoid repeating it 20 times; assume it's always there unless noted.
Routes marked **rate-limited** go through `enforceRateLimit()` (see
`SECURITY.md`) and can return `429` with a `Retry-After` header.

Request/response bodies are JSON unless noted. Zod validates every
request body — a `400` with an `issues` array means validation failed.

## Auth

### `POST /api/auth/logout`
Signs out the current Supabase session. No body. `{ loggedOut: true }`.

*(Signup, login, password reset, and email verification aren't API
routes — they call the Supabase client SDK directly from
`components/auth/*.tsx`. The one server-side auth route is the email
verification callback, `app/auth/callback/route.ts`, which isn't under
`/api` since it's a redirect target, not a JSON endpoint.)*

## Nova Tutor

### `POST /api/tutor/chat` — rate-limited (`aiChat`: 20/5min)
Body: `{ conversationId?: string, message: string, currentTopicId?: string }`.
Persists the user's message *before* calling the AI (so a failed AI call
never loses it), retrieves relevant course material via RAG if
`currentTopicId` is given, and returns
`{ conversationId, message: { id, role, content } }`. On AI failure:
`502` with `{ error, retryable, conversationId }` — the conversation ID
is still returned so the client can retry into the same thread.

## Adaptive Practice

### `POST /api/practice/next`
Body: `{ topicId, difficulty: "EASY"|"MEDIUM"|"HARD", excludeIds?: string[] }`.
Returns a validated question with `correctAnswer` and `isCorrect`
stripped out: `{ question: { id, prompt, type, difficulty, options } }`.

### `POST /api/practice/submit` — rate-limited (`aiLightweight`: 30/min)
Body: `{ attemptId, questionId, studentAnswer, timeTakenMs, confidence?, adaptiveState }`.
Grades server-side, gets AI mistake-analysis feedback (with a rule-based
fallback), recomputes mastery, updates the daily streak, and checks for a
mastery-milestone achievement. Returns
`{ isCorrect, feedback, adaptive, mastery }`.

### `POST /api/practice/start-session`
Body: `{ topicId }`. Creates a `mode: "focus"` Attempt for a client-driven
flow (Focus Mode picks its topic interactively rather than via URL, unlike
the direct `/practice/:topicId` page which creates its Attempt
server-side on page load). Returns `{ attemptId, topicId, topicName }`.

### `POST /api/practice/end-session`
Body: `{ attemptId }`. Idempotent — ending an already-ended session just
returns its summary again. Returns `{ summary: { questionCount,
correctCount, accuracy, totalTimeMs, conceptImprovement, nextRecommendation } }`.

## Study Planner

### `POST /api/planner/generate` — rate-limited (`aiLightweight`)
Body: `{ topicIds: string[], targetDate: string (ISO), dailyStudyMinutes, examGoal? }`.
Deactivates any existing active plan, generates a new one
(`generateStudyPlan()` — deterministic; only the plain-language rationale
is AI-generated, with a template fallback). Returns `{ plan, rationale }`.

### `POST /api/planner/reschedule`
No body. Marks overdue pending sessions `missed`, rebalances their minutes
across remaining days by priority (protecting higher-priority topics when
capacity is short), and returns
`{ message, createdSessions }`.

## Exam Simulator

### `POST /api/exam/start`
Body: `{ examId }`. Resumes an existing in-progress attempt if one exists
rather than creating a duplicate (so a page refresh doesn't reset the
timer). Returns `{ examAttemptId, title, durationMin, startedAt, deadline, questions }`
(questions have `correctAnswer` stripped).

### `POST /api/exam/answer`
Body: `{ examAttemptId, questionId, studentAnswer, timeTakenMs, markedForReview? }`.
Upserts on `(attemptId, questionId)` — auto-save. Rejects with `409` if
the exam is already submitted or past its deadline. Returns `{ saved: true }`.

### `GET /api/exam/[examAttemptId]`
Resume-state endpoint for a page refresh mid-exam: returns
`{ examAttemptId, title, finishedAt, deadline, questions, savedAnswers }`.

### `POST /api/exam/submit` — rate-limited (`aiLightweight`)
Body: `{ examAttemptId }`. Idempotent — submitting twice returns the
already-computed report. Grades deterministically
(`scoreExam()`), gets an AI narrative for "what actually cost you marks"
(template fallback on failure), updates the streak, and checks for an
exam personal-best achievement. Returns `{ score, report }`.

## Mistake Vault

### `POST /api/mistakes/fix` — rate-limited (`aiGeneration`: 10/hour)
Body: `{ mistakeId }`. Generates a mini-lesson (AI, template fallback) plus
up to 5 new validated practice questions for the mistake's concept, reusing
the same generation pipeline as the teacher dashboard's remedial practice.
Returns `{ lesson, questionCount, practiceHref }`.

### `POST /api/mistakes/resolve`
Body: `{ mistakeId }`. Marks a mistake resolved. Returns `{ resolved: true }`.

## Course Material (RAG)

### `POST /api/materials/upload`
`multipart/form-data`: `file` (PDF/txt/md, 15MB max), `topicId?`. Extracts
text, chunks it, embeds each chunk (requires `OPENAI_API_KEY` — see
`DEPLOYMENT.md`), stores in pgvector. Runs on the Node runtime (not Edge)
because `pdf-parse` needs it. Returns
`{ materialId, chunkCount, failedChunkCount, message }`.

### `DELETE /api/materials/[materialId]`
Removes a material and its chunks (cascades). Only the uploader or a
teacher/admin can delete. Returns `{ deleted: true }`.

## Onboarding

### `POST /api/onboarding/complete` — rate-limited (`aiLightweight`)
Body: `{ examGoal, subjectIds, currentLevel, targetExamDate?, dailyStudyMinutes, learningGoal?, preferredDifficulty }`.
Saves the `Profile` and generates the student's first study plan directly
(calls `generateStudyPlan()` itself, not via HTTP to `/api/planner/generate`
— see `ARCHITECTURE.md`). Returns `{ onboarded: true, planSummary }`
(`planSummary` can be `null` if no plannable topics existed).

## Teacher

### `POST /api/teacher/remedial-practice` — rate-limited (`aiGeneration`), TEACHER/ADMIN only
Body: `{ topicId, difficulty? }`. Generates up to 5 validated questions for
a topic. Returns `{ createdCount, failedCount, message }`.

### `POST /api/teacher/assignments` — TEACHER/ADMIN only
Body: `{ courseId, title, dueDate? }`. A teacher can only create
assignments on courses they own (`403` otherwise; admins bypass this
check). Returns `{ assignment }`.

## Notifications

### `GET /api/notifications`
Returns `{ notifications: Notification[], unreadCount }` — most recent 20.

### `POST /api/notifications/read`
Body: `{ notificationId: string }` **or** `{ all: true }`. Returns
`{ read: true }` or `{ markedAll: true }`.

## Error shape

Every error response is `{ error: string }`, sometimes with extra fields
(`issues` for validation errors, `retryable` for AI failures,
`retryAfterSeconds`-equivalent via the `Retry-After` header for rate
limits). There's no envelope/wrapper beyond that — a 200 response is just
the route's documented shape directly, not `{ data: ... }`.
