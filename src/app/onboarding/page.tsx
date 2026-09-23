import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/db/client";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "TEACHER") redirect("/teacher");
  if (user.profile?.onboardedAt) redirect("/dashboard");

  const subjects = await prisma.subject.findMany({
    orderBy: { order: "asc" },
    include: {
      course: {
        select: {
          examGoal: true,
        },
      },
    },
  });

  return (
    <main className="min-h-dvh bg-paper">
      <OnboardingWizard
        subjects={subjects.map((s) => ({
          id: s.id,
          name: s.name,
          examGoal: s.course.examGoal,
        }))}
      />
    </main>
  );
}
