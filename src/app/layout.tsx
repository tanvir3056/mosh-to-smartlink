import type { Metadata } from "next";
import Script from "next/script";

import { THEME_BOOTSTRAP_SCRIPT } from "@/components/admin/theme-bootstrap-script";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import { appEnv } from "@/lib/env";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(appEnv.appUrl),
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-[var(--app-bg)] text-[var(--app-text)]">
        <Script
          id="bs-theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
        />
        {children}
      </body>
    </html>
  );
}
