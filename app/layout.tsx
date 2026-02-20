import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import RootLayoutClient from "./layout-client";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cliniva — Copiloto de Terapia",
  description: "Copiloto de terapia (MVP)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} ${geistMono.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
