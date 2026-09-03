import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import "./globals.css";

// latin-ext je obavezan — bez njega č, ć, ž, š, đ padaju na fallback font.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const serif = Source_Serif_4({
  variable: "--font-serif-display",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  weight: ["400", "600"],
});

/**
 * Na Vercelu je VERCEL_PROJECT_PRODUCTION_URL stvarna produkcijska domena, pa
 * OG slika radi i na preview deploymentima bez ručnog podešavanja.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "eRačun Semafor — provjera spremnosti za Fiskalizaciju 2.0",
    template: "%s — eRačun Semafor",
  },
  description:
    "Besplatna provjera u 2 minute: koje se obveze eRačuna i Fiskalizacije 2.0 odnose baš na vas, od kojeg datuma, što vam nedostaje i koji su rokovi. Za obrte i male firme u Hrvatskoj.",
  openGraph: {
    title: "eRačun Semafor — provjera spremnosti za Fiskalizaciju 2.0",
    description:
      "Provjerite u 2 minute što se od obveza eRačuna odnosi baš na vas i što vam nedostaje. Izvještaj s rokovima, člancima zakona i pitanjima za knjigovođu.",
    locale: "hr_HR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr">
      <body className={`${inter.variable} ${serif.variable}`}>
        <header className="no-print border-b border-[var(--line)]">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
            <Link href="/" className="flex items-center gap-2.5 no-underline">
              <Semafor />
              <span className="text-[15px] font-semibold tracking-tight text-[var(--ink)]">
                eRačun Semafor
              </span>
            </Link>
            <Link
              href="/provjera"
              className="rounded-md border border-[var(--line-2)] px-3.5 py-1.5 text-[14px] font-medium text-[var(--ink-2)] no-underline transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              Pokreni provjeru
            </Link>
          </div>
        </header>

        {children}

        <footer className="no-print border-t border-[var(--line)] bg-[var(--surface-2)]">
          <div className="mx-auto max-w-5xl px-5 py-10 text-[14px] leading-relaxed text-[var(--ink-3)]">
            <p className="m-0 max-w-2xl">
              <strong className="font-semibold text-[var(--ink-2)]">
                Ovo nije pravno ni porezno savjetovanje.
              </strong>{" "}
              Provjera je operativna pomoć temeljena na javno objavljenim propisima. Konačnu
              interpretaciju za vaš slučaj potvrđuje knjigovođa, informacijski posrednik ili
              Porezna uprava.
            </p>
            <p className="mt-5 mb-0">
              FAITECH, obrt za informatičke usluge i razvoj IT sustava · Propisi provjereni
              3.9.2026.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

function Semafor() {
  return (
    <span aria-hidden className="flex flex-col gap-[3px] rounded-[3px] bg-[var(--ink)] p-[3px]">
      <span className="block h-[5px] w-[5px] rounded-full bg-[var(--kriticno)]" />
      <span className="block h-[5px] w-[5px] rounded-full bg-[#e0a53a]" />
      <span className="block h-[5px] w-[5px] rounded-full bg-[var(--ok)]" />
    </span>
  );
}
