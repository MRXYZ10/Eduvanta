import { prisma } from "../src/db/client";
import { ensureQuestionBank } from "../src/services/practice/ensureQuestionBank";

async function main() {
  const topics = await prisma.topic.findMany({ select: { id: true, name: true }, orderBy: [{ subjectId: "asc" }, { order: "asc" }] });
  let totalCreated = 0;

  for (const topic of topics) {
    const result = await ensureQuestionBank(topic.id);
    if (result.created > 0) {
      totalCreated += result.created;
      console.log(`${topic.name}: +${result.created} questions (${result.available} available)`);
    }
  }

  console.log(`Question-bank warmup complete: ${totalCreated} new questions.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
