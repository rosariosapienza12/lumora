import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const instrument = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Lumora: presentazioni interattive", template: "%s · Lumora" },
  description: "Crea presentazioni, lezioni e materiali interattivi con animazioni, hotspot e pop-up. Senza scrivere codice.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render per request so the CSP nonce from src/proxy.ts is applied to every script.
  await connection();
  return (
    <html lang="it" className={`${bricolage.variable} ${instrument.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
