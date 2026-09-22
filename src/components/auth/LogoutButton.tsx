"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={logout} className={className ?? "flex items-center gap-3 rounded-md px-2 py-2 text-sm text-ink/70 hover:bg-ink/5"}>
      <LogOut className="h-4 w-4" strokeWidth={1.75} />
      Log out
    </button>
  );
}
