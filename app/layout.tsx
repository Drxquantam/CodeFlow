import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeFlow",
  description: "A dark DSA visualizer for AI review, dry runs, graph animation, and complexity curves.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
