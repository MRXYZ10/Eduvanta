"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Target, Sparkles, User, Gem } from "lucide-react";

const ICONS = {
  home: Home,
  "book-open": BookOpen,
  target: Target,
  sparkles: Sparkles,
  user: User,
  gem: Gem,
} as const;

type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

export function NavLinks({ items, mobile = false }: { items: readonly NavItem[]; mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <>
      {items.map(({ href, label, icon }) => {
        const Icon = ICONS[icon];
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={mobile ? `mobile-nav-item ${active ? "is-active" : ""}` : `sidebar-link ${active ? "is-active" : ""}`}
          >
            <span className="nav-icon-wrap"><Icon className="h-[17px] w-[17px]" strokeWidth={1.9} /></span>
            <span className={mobile ? "truncate text-[10px] font-semibold" : "font-medium"}>{label}</span>
          </Link>
        );
      })}
    </>
  );
}
