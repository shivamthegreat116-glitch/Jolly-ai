"use client";

import Link from "next/link";
import { JollyLogo } from "@/components/JollyLogo";
import { EmergencyButton } from "@/components/EmergencyButton";

export function SanctuaryHeader({
  rightContent,
  showEmergency = true,
}: {
  rightContent?: React.ReactNode;
  showEmergency?: boolean;
}) {
  return (
    <header className="fixed top-0 left-0 w-full z-40 pt-safe bg-surface-crisp/95 backdrop-blur-md border-b border-border-subtle shadow-xs">
      <div className="h-16 px-4 sm:px-6 max-w-5xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link href="/" className="flex items-center gap-2 focus:outline-none focus:ring-1 focus:ring-primary rounded-lg">
            <JollyLogo className="h-7 sm:h-8 w-auto" />
          </Link>
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-subtle text-primary border border-border-subtle">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
            <span className="font-label-sm text-label-sm font-medium">Here to listen</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {rightContent}
          {showEmergency && <EmergencyButton />}
        </div>
      </div>
    </header>
  );
}
