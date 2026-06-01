import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import Script from "next/script";

import { THEME_BOOTSTRAP_SCRIPT } from "@/components/admin/theme-bootstrap-script";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import { appEnv } from "@/lib/env";
import { cn } from "@/lib/utils";

import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  variable: "--font-hanken",
});

const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  variable: "--font-schibsted",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  variable: "--font-jetbrains",
});

const ADMIN_FONT_VARIABLES = cn(
  hankenGrotesk.variable,
  schibstedGrotesk.variable,
  jetBrainsMono.variable,
);

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
    <html
      lang="en"
      className={cn("h-full antialiased", ADMIN_FONT_VARIABLES)}
      suppressHydrationWarning
    >
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
