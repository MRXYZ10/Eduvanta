import Link from "next/link";
import {
  Home,
  BookOpen,
  Target,
  Sparkles,
  User,
  Gem,
} from "lucide-react";
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
    <div className="min-h-dvh bg-paper md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-line/70 bg-paper/80 md:flex md:w-60 md:flex-col md:px-3 md:py-5">
        <div className="mb-7 px-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cobalt text-sm font-semibold text-white shadow-sm">
              E
            </div>
            <div>
              <div className="font-serif text-lg leading-none text-ink">
                EduVanta
              </div>
              <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.1em] text-ink/40">
                Your learning space
              </div>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink/70 transition-all duration-200 hover:bg-cobalt-soft hover:text-cobalt"
            >
              <Icon
                className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105"
                strokeWidth={1.75}
              />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-5 border-t border-line/60 pt-4 px-1">
          <LogoutButton />
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-20 md:pb-0">
        {/* Top bar */}
        <div className="sticky top-0 z-20 flex items-center justify-end gap-2 border-b border-line/60 bg-paper/85 px-4 py-2.5 backdrop-blur-xl md:border-0 md:bg-transparent md:px-8 md:pt-6">
          <SearchBar />
          <ThemeToggle />
          <NotificationBell />
        </div>

        <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-paper/92 px-1 pt-2 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl md:hidden"
        style={{
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto flex max-w-lg justify-around">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-ink/55 transition-colors duration-200 hover:bg-ink/5 hover:text-cobalt"
            >
              <Icon
                className="h-[19px] w-[19px] transition-transform duration-200 group-hover:scale-105"
                strokeWidth={1.75}
              />
              <span className="truncate text-[10px] font-medium">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}