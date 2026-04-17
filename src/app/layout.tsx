import type { Metadata } from "next";

import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[var(--app-bg)] text-[var(--app-text)]">
        {children}
      </body>
    </html>
  );
}
