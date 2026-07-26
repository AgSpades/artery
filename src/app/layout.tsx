import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { ArteryHeader } from "@/components/artery-header";

import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Artery — Misconception recovery",
  description: "Bilingual voice-based misconception recovery for education platforms.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <ArteryHeader />
        {children}
      </body>
    </html>
  );
}
