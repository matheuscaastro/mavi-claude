import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Fontes hospedadas aqui (woff2 variável, só o subconjunto latino): sem pedir nada ao Google e sem bloquear a renderização.
const inter = localFont({ src: "./fonts/inter-latin-wght-normal.woff2", weight: "100 900", display: "swap", variable: "--font-inter" });
const cormorant = localFont({ src: "./fonts/cormorant-garamond-latin-wght-normal.woff2", weight: "300 700", display: "swap", variable: "--font-cormorant" });

export const metadata: Metadata = {
  title: { default: "MAVI Podologia", template: "%s · MAVI Podologia" },
  description: "Agenda, cadastros e caixa do salão de podologia MAVI.",
  icons: { icon: "/logo.jpg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#24443F",
  colorScheme: "light",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${cormorant.variable}`}>
      <body>{children}</body>
    </html>
  );
}
