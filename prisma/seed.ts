import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// All records below are DEMO DATA for local development only.
const DEMO_TAG = "[demo]";

async function main() {
  const student = await prisma.user.upsert({
    where: { email: "demo.student@eduvanta.dev" },
    update: {},
    create: {
      email: "demo.student@eduvanta.dev",
      role: "STUDENT",
      profile: {
        create: {
          fullName: `${DEMO_TAG} Asha Verma`,
          examGoal: "JEE",
          targetExamDate: new Date("2027-05-01"),
          currentLevel: "intermediate",
          dailyStudyMinutes: 90,
          preferredDifficulty: "adaptive",
          learningGoal: "Build strong fundamentals in Functions and Relations",
          onboardedAt: new Date(),
        },
      },
      streak: { create: { currentStreak: 4, longestStreak: 11 } },
    },
    include: { profile: true },
  });

  const teacher = await prisma.user.upsert({
    where: { email: "demo.teacher@eduvanta.dev" },
    update: {},
    create: { email: "demo.teacher@eduvanta.dev", role: "TEACHER" },
  });

  await prisma.user.upsert({
    where: { email: "demo.admin@eduvanta.dev" },
    update: {},
    create: { email: "demo.admin@eduvanta.dev", role: "ADMIN" },
  });

  const course = await prisma.course.create({
    data: {
      title: `${DEMO_TAG} JEE Mathematics`,
      examGoal: "JEE",
      teacherId: teacher.id,
      subjects: {
        create: [
          {
            name: "Sets, Relations & Functions",
            order: 1,
            topics: {
              create: [
                {
                  name: "Functions",
                  order: 1,
                  concepts: { create: [{ name: "Function composition" }, { name: "Domain and range" }] },
                },
                { name: "Relations", order: 2, concepts: { create: [{ name: "Equivalence relations" }] } },
                { name: "Sets", order: 3, concepts: { create: [{ name: "Set operations" }] } },
              ],
            },
          },
        ],
      },
    },
    include: { subjects: { include: { topics: { include: { concepts: true } } } } },
  });

  await prisma.enrollment.create({ data: { userId: student.id, courseId: course.id } });

  const functionsSubject = course.subjects[0];
  if (!functionsSubject) {
    throw new Error("Seed failed: course has no subjects.");
  }

  const functionsTopic = functionsSubject.topics[0];
  if (!functionsTopic) {
    throw new Error("Seed failed: first subject has no topics.");
  }

  const compositionConcept = functionsTopic.concepts[0];
  if (!compositionConcept) {
    throw new Error("Seed failed: first topic has no concepts.");
  }

  const questions = await prisma.$transaction([
    prisma.question.create({
      data: {
        topicId: functionsTopic.id,
        conceptId: compositionConcept.id,
        type: "MCQ",
        difficulty: "EASY",
        prompt: `${DEMO_TAG} If f(x) = x + 2 and g(x) = x^2, what is (fÃ¢Ë†Ëœg)(x)?`,
        explanation: "Function composition applies g first, then f: f(g(x)) = g(x) + 2 = x^2 + 2.",
        validated: true,
        correctAnswer: { optionLabel: "x^2 + 2" },
        options: {
          create: [
            { label: "x^2 + 2", isCorrect: true, order: 1 },
            { label: "x^2 + 4", isCorrect: false, order: 2 },
            { label: "(x+2)^2", isCorrect: false, order: 3 },
          ],
        },
      },
    }),
    prisma.question.create({
      data: {
        topicId: functionsTopic.id,
        conceptId: compositionConcept.id,
        type: "MCQ",
        difficulty: "MEDIUM",
        prompt: `${DEMO_TAG} If f(x) = 2x - 1 and g(x) = f(f(x)), what is g(3)?`,
        explanation: "f(3) = 5, then f(5) = 9.",
        validated: true,
        correctAnswer: { optionLabel: "9" },
        options: {
          create: [
            { label: "9", isCorrect: true, order: 1 },
            { label: "5", isCorrect: false, order: 2 },
            { label: "11", isCorrect: false, order: 3 },
          ],
        },
      },
    }),
  ]);

  const attempt = await prisma.attempt.create({
    data: { userId: student.id, mode: "practice", topicId: functionsTopic.id, finishedAt: new Date() },
  });

  await prisma.answer.create({
    data: {
      attemptId: attempt.id,
      questionId: questions[0].id,
      studentAnswer: { optionLabel: "x^2 + 4" },
      isCorrect: false,
      timeTakenMs: 25_000,
    },
  });

  await prisma.mistake.create({
    data: {
      userId: student.id,
      questionId: questions[0].id,
      conceptId: compositionConcept.id,
      studentAnswer: { optionLabel: "x^2 + 4" },
      correctAnswer: { optionLabel: "x^2 + 2" },
      mistakeType: "conceptual",
      explanation: `${DEMO_TAG} Applied f before g instead of g before f Ã¢â‚¬â€ order of composition confusion.`,
      occurrences: 2,
    },
  });

  await prisma.mastery.create({
    data: {
      userId: student.id,
      conceptId: compositionConcept.id,
      score: 58,
      band: "DEVELOPING",
      trend: -4,
    },
  });

  await prisma.recommendation.create({
    data: {
      userId: student.id,
      title: `${DEMO_TAG} Function composition is your weakest high-impact topic`,
      reason: "You've missed 2 composition questions with the same order-of-operations mistake.",
      actionLabel: "Practice Now",
      actionHref: `/practice/${functionsTopic.id}`,
      priority: 1,
    },
  });

  await prisma.studyPlan.create({
    data: {
      userId: student.id,
      examGoal: "JEE",
      targetDate: new Date("2027-05-01"),
      sessions: {
        create: [
          { userId: student.id, scheduledFor: new Date(Date.now() + 86_400_000), durationMin: 15, topicLabel: `${DEMO_TAG} Review Functions` },
          { userId: student.id, scheduledFor: new Date(Date.now() + 86_400_000), durationMin: 20, topicLabel: `${DEMO_TAG} Adaptive Practice` },
        ],
      },
    },
  });

  const exam = await prisma.exam.create({
    data: {
      title: `${DEMO_TAG} Functions Mock Test`,
      courseId: course.id,
      durationMin: 20,
      examQuestions: {
        create: questions.map((q, i) => ({ questionId: q.id, order: i })),
      },
    },
  });

  // A few more demo students with topic-level mastery so the teacher
  // dashboard's class analytics / weak-topic detection has enough students
  // to be meaningful (identifyWeakTopics requires >= 3 by default).
  const classmateScores = [22, 35, 88]; // two struggling, one strong Ã¢â‚¬â€ mixed signal
  for (let i = 0; i < classmateScores.length; i++) {
    const classmate = await prisma.user.upsert({
      where: { email: `demo.classmate${i + 1}@eduvanta.dev` },
      update: {},
      create: { email: `demo.classmate${i + 1}@eduvanta.dev`, role: "STUDENT" },
    });
    const classmateScore = classmateScores[i];
    if (classmateScore === undefined) {
      throw new Error(`Seed failed: missing score for classmate ${i}.`);
    }

    await prisma.mastery.create({
      data: {
        userId: classmate.id,
        topicId: functionsTopic.id,
        score: classmateScore,
        band: classmateScore < 40 ? "NEEDS_ATTENTION" : "MASTERED",
        trend: 0,
      },
    });
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: classmate.id, courseId: course.id } },
      update: {},
      create: { userId: classmate.id, courseId: course.id },
    });
  }
  // The demo student's own topic-level mastery, so the class stat includes them too.
  await prisma.mastery.create({
    data: { userId: student.id, topicId: functionsTopic.id, score: 58, band: "DEVELOPING", trend: -4 },
  });

  console.log("Seed complete:", { student: student.email, teacher: teacher.email, course: course.title, exam: exam.title });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
