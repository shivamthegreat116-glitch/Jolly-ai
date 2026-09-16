import React from "react";
import Image from "next/image";

export function JollyLogo({
  className = "",
  showWordmark = true,
  size = 34,
}: {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}) {
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <Image
          src="/logo.png"
          alt="Jolly AI"
          width={size}
          height={size}
          className="h-full w-auto object-contain drop-shadow-xs"
          priority
        />
      </div>
      {showWordmark && (
        <span className="font-headline-sm text-text-primary tracking-tight font-semibold flex items-center gap-1 leading-none">
          <span>Jolly</span>
          <span className="text-primary-container font-medium">AI</span>
        </span>
      )}
    </div>
  );
}
