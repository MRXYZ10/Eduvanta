-- CreateTable
CREATE TABLE "MasterySnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "band" "MasteryBand" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MasterySnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MasterySnapshot_userId_recordedAt_idx" ON "MasterySnapshot"("userId", "recordedAt");
CREATE INDEX "MasterySnapshot_userId_topicId_recordedAt_idx" ON "MasterySnapshot"("userId", "topicId", "recordedAt");
ALTER TABLE "MasterySnapshot" ADD CONSTRAINT "MasterySnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MasterySnapshot" ADD CONSTRAINT "MasterySnapshot_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
