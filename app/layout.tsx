import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IDEAL | Growth conversations",
  description: "Focused development conversations, grounded in the HTX IDEAL framework.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
