import { Hanken_Grotesk, JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";

import { cn } from "@/lib/utils";

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

export const ADMIN_FONT_VARIABLES = cn(
  hankenGrotesk.variable,
  schibstedGrotesk.variable,
  jetBrainsMono.variable,
);

export function adminThemeClassName(className: string) {
  return cn("bs-admin-theme", ADMIN_FONT_VARIABLES, className);
}
