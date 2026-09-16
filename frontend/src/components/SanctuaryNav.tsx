"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SanctuaryNav({ activePath }: { activePath?: string }) {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home", icon: "spa", key: "home" },
    { href: "/chat", label: "Talk", icon: "forum", key: "talk" },
    { href: "/results", label: "Assessment", icon: "assignment_turned_in", key: "assessment" },
    { href: "/summary", label: "Summary", icon: "description", key: "summary" },
    { href: "/privacy", label: "Privacy", icon: "lock_open", key: "privacy-language" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-40 pb-safe bg-surface-crisp/95 backdrop-blur-md border-t border-border-subtle shadow-[0_-2px_12px_rgba(36,91,90,0.04)]">
      <div className="h-16 px-2 flex items-center justify-around max-w-lg mx-auto">
        {links.map((link) => {
          const active =
            pathname === link.href ||
            activePath === link.key ||
            activePath === link.href ||
            activePath === link.label.toLowerCase();
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 flex flex-col items-center justify-center min-h-[44px] transition-colors ${
                active
                  ? "text-primary-container font-semibold"
                  : "text-text-secondary hover:text-text-primary font-normal"
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {link.icon}
              </span>
              <span className="font-label-sm text-label-sm mt-0.5">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
