import { ADMIN_FONT_VARIABLES } from "@/lib/admin-fonts";

export default function AdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className={ADMIN_FONT_VARIABLES}>{children}</div>;
}
