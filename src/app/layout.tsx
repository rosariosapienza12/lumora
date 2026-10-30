import type { Metadata } from "next";
import {
  Bebas_Neue,
  Bricolage_Grotesque,
  Caveat,
  Dancing_Script,
  Instrument_Sans,
  JetBrains_Mono,
  Lobster,
  Merriweather,
  Montserrat,
  Nunito,
  Oswald,
  Pacifico,
  Playfair_Display,
  Space_Grotesk,
  Inter,
  Poppins,
  Raleway,
  Lora,
  Roboto_Slab,
  Archivo_Black,
  Abril_Fatface,
  Permanent_Marker,
  Shadows_Into_Light,
  Indie_Flower,
  Righteous,
  Comfortaa,
  Cinzel,
  Josefin_Sans,
  Quicksand,
  Fredoka,
  Press_Start_2P,
  Satisfy,
} from "next/font/google";
import { connection } from "next/server";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const instrument = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"] });
// Extra typefaces offered in the editor.
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], preload: false });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], preload: false });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], preload: false });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], preload: false });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], preload: false });
const merriweather = Merriweather({ variable: "--font-merriweather", subsets: ["latin"], preload: false });
const bebas = Bebas_Neue({ variable: "--font-bebas", subsets: ["latin"], weight: "400", preload: false });
const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"], preload: false });
const space = Space_Grotesk({ variable: "--font-space", subsets: ["latin"], preload: false });
const dancing = Dancing_Script({ variable: "--font-dancing", subsets: ["latin"], preload: false });
const pacifico = Pacifico({ variable: "--font-pacifico", subsets: ["latin"], weight: "400", preload: false });
const lobster = Lobster({ variable: "--font-lobster", subsets: ["latin"], weight: "400", preload: false });
const extra0 = Inter({ variable: "--font-inter", subsets: ["latin"], preload: false });
const extra1 = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "700"], preload: false });
const extra2 = Raleway({ variable: "--font-raleway", subsets: ["latin"], preload: false });
const extra3 = Lora({ variable: "--font-lora", subsets: ["latin"], preload: false });
const extra4 = Roboto_Slab({ variable: "--font-slab", subsets: ["latin"], preload: false });
const extra5 = Archivo_Black({ variable: "--font-archivo", subsets: ["latin"], weight: "400", preload: false });
const extra6 = Abril_Fatface({ variable: "--font-abril", subsets: ["latin"], weight: "400", preload: false });
const extra7 = Permanent_Marker({ variable: "--font-marker", subsets: ["latin"], weight: "400", preload: false });
const extra8 = Shadows_Into_Light({ variable: "--font-shadows", subsets: ["latin"], weight: "400", preload: false });
const extra9 = Indie_Flower({ variable: "--font-indie", subsets: ["latin"], weight: "400", preload: false });
const extra10 = Righteous({ variable: "--font-righteous", subsets: ["latin"], weight: "400", preload: false });
const extra11 = Comfortaa({ variable: "--font-comfortaa", subsets: ["latin"], preload: false });
const extra12 = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], preload: false });
const extra13 = Josefin_Sans({ variable: "--font-josefin", subsets: ["latin"], preload: false });
const extra14 = Quicksand({ variable: "--font-quicksand", subsets: ["latin"], preload: false });
const extra15 = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], preload: false });
const extra16 = Press_Start_2P({ variable: "--font-pixel", subsets: ["latin"], weight: "400", preload: false });
const extra17 = Satisfy({ variable: "--font-satisfy", subsets: ["latin"], weight: "400", preload: false });
const fontVars = [playfair, nunito, caveat, mono, montserrat, merriweather, bebas, oswald, space, dancing, pacifico, lobster, extra0, extra1, extra2, extra3, extra4, extra5, extra6, extra7, extra8, extra9, extra10, extra11, extra12, extra13, extra14, extra15, extra16, extra17]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  title: { default: "Lumora: presentazioni interattive", template: "%s · Lumora" },
  description: "Crea presentazioni, lezioni e materiali interattivi con animazioni, hotspot e pop-up. Senza scrivere codice.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render per request so the CSP nonce from src/proxy.ts is applied to every script.
  await connection();
  return (
    <html lang="it" className={`${bricolage.variable} ${instrument.variable} ${fontVars} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
