import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { TutorChat } from "@/components/tutor/TutorChat";
import { NovaControls } from "@/components/tutor/NovaControls";

export default async function TutorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell>
      <NovaControls />
      <TutorChat />
    </AppShell>
  );
}

