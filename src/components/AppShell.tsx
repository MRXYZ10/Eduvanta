import Link from "next/link";
import { Home, BookOpen, Target, Sparkles, User, Gem } from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SearchBar } from "@/components/search/SearchBar";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/practice", label: "Practice", icon: Target },
  { href: "/tutor", label: "Nova", icon: Sparkles },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/packages", label: "Packages", icon: Gem },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-line md:px-4 md:py-6">
        <div className="mb-8 px-2 font-serif text-lg">EduVanta</div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-ink/80 hover:bg-ink/5"
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {label}
            </Link>
          ))}
        </nav>
        <LogoutButton />
      </aside>

      <div className="flex-1 pb-20 md:pb-0">
        {/* Slim top bar for search + theme + notifications â€” deliberately
            not additional bottom-nav icons on mobile; all three live
            here on both breakpoints instead. */}
        <div className="flex items-center justify-end gap-2 border-b border-line px-4 py-2 md:border-0 md:px-8 md:pt-6">
          <SearchBar />
          <ThemeToggle />
          <NotificationBell />
        </div>
        <main className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-4">{children}</main>
      </div>

      {/* Mobile bottom nav â€” chat input etc. always sit above this via pb-20 on main */}
      <nav
        className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-line bg-paper/95 py-2 backdrop-blur md:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex flex-col items-center gap-1 px-3 py-1 text-ink/70">
            <Icon className="h-5 w-5" strokeWidth={1.75} />
            <span className="text-[11px]">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}



