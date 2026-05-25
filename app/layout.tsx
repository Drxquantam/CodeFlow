import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeFlow",
  description: "A dark AI-powered DSA code mentor for reviews, dry runs, test cases, and complexity analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
