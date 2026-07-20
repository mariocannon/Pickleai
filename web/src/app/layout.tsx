import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PickleAI — Your personal pickleball coach, in your pocket",
  description:
    "Upload a clip of your game and get pro-level pickleball feedback, drills, and a plan to improve — in minutes, not $100 an hour.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
