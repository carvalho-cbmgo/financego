import { ReactNode } from "react";
import "./globals.css";
import GlobalLoadingOverlay from "@/components/global-loading-overlay";

export const metadata = {
  title: "Finance GO",
  description: "Gestão financeira pessoal por banco, conta e consolidação de transações.",
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
      <body>
        <GlobalLoadingOverlay />
        {children}
      </body>
    </html>
  );
}
