-- EduVanta performance indexes for adaptive practice and analytics.
CREATE INDEX IF NOT EXISTS "Question_topicId_validated_difficulty_createdAt_idx"
  ON "Question" ("topicId", "validated", "difficulty", "createdAt");

CREATE INDEX IF NOT EXISTS "Answer_attemptId_createdAt_idx"
  ON "Answer" ("attemptId", "createdAt");

CREATE INDEX IF NOT EXISTS "Mistake_userId_conceptId_resolved_idx"
  ON "Mistake" ("userId", "conceptId", "resolved");
