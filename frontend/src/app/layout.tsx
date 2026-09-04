import type { Metadata } from "next";
import "./globals.css";
import { DisclaimerBar } from "@/components/DisclaimerBar";

export const metadata: Metadata = {
  title: "Jolly AI — Support & triage, not a diagnosis",
  description:
    "Privacy-first multilingual support chatbot for complainants accessing NHAA (14566) and related pathways. Not a medical, legal, or emergency service.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DisclaimerBar />
        {children}
      </body>
    </html>
  );
}
