import { ReactNode } from "react";

export const metadata = {
  title: "Finance MVP",
  description: "Controle financeiro pessoal com Open Finance",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Finance MVP",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#6d5dfc",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif" }}>{children}</body>
    </html>
  );
}
