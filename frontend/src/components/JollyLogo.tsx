import React from "react";

export function JollyLogo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 44"
      fill="none"
      className={className}
      aria-label="Jolly AI"
    >
      <g transform="translate(4, 6)">
        {/* Soft organic overlapping calm wave / leaf ripple emblem */}
        <path
          d="M16 28C8.5 28 2 22 2 14.5C2 7 8 2 16 2C22 2 27 6 29 11C27 10 24 9.5 21 9.5C13.5 9.5 7.5 15.5 7.5 23C7.5 25 8 26.8 9 28.3C11 28.1 13.5 28 16 28Z"
          fill="#7FA99A"
          fillOpacity="0.45"
        />
        <path
          d="M16 30C23.5 30 30 24 30 16.5C30 9 24 4 16 4C10 4 5 8 3 13C5 12 8 11.5 11 11.5C18.5 11.5 24.5 17.5 24.5 25C24.5 27 24 28.8 23 30.3C21 30.1 18.5 30 16 30Z"
          fill="#245B5A"
        />
        <circle cx="16" cy="17" r="3.5" fill="#DCEBE4" />
      </g>
      <text
        x="44"
        y="28"
        fontFamily="'DM Sans', 'Inter', sans-serif"
        fontSize="20"
        fontWeight="600"
        fill="#243333"
        letterSpacing="-0.02em"
      >
        Jolly<tspan fill="#7FA99A" fontWeight="400"> AI</tspan>
      </text>
    </svg>
  );
}
