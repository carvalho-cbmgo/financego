import { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Finance GO",
  description: "Gestao financeira pessoal por banco, conta e consolidacao de transacoes.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Finance GO",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
