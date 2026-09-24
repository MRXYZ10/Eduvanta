import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCourseCatalog } from "@/services/courses/getCourseCatalog";
import { AppShell } from "@/components/AppShell";
import { CourseCatalog } from "@/components/learn/CourseCatalog";

export default async function CourseCatalogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const courses = await getCourseCatalog(user.id);

  return (
    <AppShell>
      <header className="mb-8">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-cobalt">Course catalog</div>
        <h1 className="text-3xl sm:text-4xl">Explore courses</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">Join another course without resetting your existing learning progress.</p>
      </header>
      <CourseCatalog courses={courses} />
    </AppShell>
  );
}
