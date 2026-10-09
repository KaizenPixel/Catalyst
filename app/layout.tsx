import type { Metadata } from "next";
import "./globals.css";
import "./surfaces.css";

export const metadata: Metadata = {
  title: "Catalyst · Development Mentor",
  description: "Learn software engineering through guided reviews of your own projects.",
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

