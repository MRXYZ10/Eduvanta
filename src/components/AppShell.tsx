import { ChevronRight, Sparkles } from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SearchBar } from "@/components/search/SearchBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavLinks } from "@/components/NavLinks";

const NAV = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/learn", label: "Learn", icon: "book-open" },
  { href: "/practice", label: "Practice", icon: "target" },
  { href: "/tutor", label: "Nova", icon: "sparkles" },
  { href: "/profile", label: "Profile", icon: "user" },
  { href: "/packages", label: "Packages", icon: "gem" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper md:flex">
      <aside className="app-sidebar hidden md:flex">
        <div className="px-2">
          <div className="flex items-center gap-3">
            <div className="brand-mark">E</div>
            <div className="min-w-0">
              <div className="font-serif text-xl leading-none tracking-tight text-ink">EduVanta</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/35">AI learning studio</div>
            </div>
          </div>
        </div>

        <div className="sidebar-label">Workspace</div>
        <nav className="flex flex-1 flex-col gap-1">
          <NavLinks items={NAV} />
        </nav>

        <div className="sidebar-tip">
          <Sparkles className="h-4 w-4 text-cobalt" />
          <div>
            <p className="text-xs font-semibold text-ink">Keep your streak alive</p>
            <p className="mt-0.5 text-[11px] leading-4 text-ink/45">A small session today beats a perfect plan tomorrow.</p>
          </div>
        </div>

        <div className="mt-3 border-t border-line/60 pt-3">
          <LogoutButton />
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-20 md:pb-0">
        <div className="app-topbar">
          <div className="hidden items-center gap-2 text-xs text-ink/35 lg:flex">
            <span>EduVanta</span><ChevronRight className="h-3 w-3" />
            <span className="font-medium text-ink/55">Learning studio</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <SearchBar />
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>

        <main className="app-main mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 md:px-8 md:py-7">
          {children}
        </main>
      </div>

      <nav className="mobile-nav md:hidden">
        <div className="mx-auto flex max-w-lg justify-around">
          <NavLinks items={NAV} mobile />
        </div>
      </nav>
    </div>
  );
}

