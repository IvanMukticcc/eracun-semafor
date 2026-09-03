import Link from "next/link";
import type { Metadata } from "next";
import { daysSince2026, daysUntil2027, danaLabel, todayISO } from "@/lib/date";
import { PartnerSection } from "../rezultat/partner";

/**
 * Odredište za knjigovodstvene urede.
 *
 * Postoji jer je ured stizao ili na `mailto:` — koji ne završi nigdje mjerljivo
 * — ili na obrazac zakopan na izvještaju, do kojeg se dolazi tek nakon trinaest
 * pitanja. Za kanal koji je u `briefs/2026-09-03-monetizacija.md` označen kao
 * onaj s najvećom polugom, oboje je bilo trenje.
 *
 * Ton je namjerno drukčiji od naslovnice: ured nije obveznik nego onaj kome
 * osamdeset obveznika postavlja isto pitanje.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  // Layout dodaje „— eRačun Semafor”; ovdje stoji samo dio koji se mijenja.
  title: "Za knjigovodstvene urede",
  description:
    "Provjera eRačun spremnosti za sve klijente ureda odjednom, s izvještajima koji nose ime ureda i popisom klijenata poredanim po riziku.",
};

export default function KnjigovodstveniUred() {
  const today = todayISO();
  const since = daysSince2026(today);
  const days = daysUntil2027(today);

  return (
    <main className="mx-auto max-w-4xl px-5">
      <section className="py-14 md:py-20">
        <p className="m-0 text-[13px] font-semibold uppercase tracking-[0.09em] text-[var(--brand)]">
          Za knjigovodstvene urede
        </p>
        <h1 className="display mt-4 mb-0 text-[38px] text-[var(--ink)] sm:text-[48px]">
          Jedan ured, osamdeset istih razgovora
        </h1>
        <p className="mt-6 mb-0 max-w-2xl text-[19px] leading-relaxed text-[var(--ink-2)]">
          Kroz jesen će vas svaki mali klijent pitati isto: moram li ja nešto, od kada, i što ako
          nisam. Umjesto da svakom objašnjavate ispočetka, provjera odgovori jednom po klijentu —
          pismeno, s člankom zakona uz svaku tvrdnju.
        </p>

        <div className="mt-9 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--kriticno-line)] bg-[var(--kriticno-bg)] p-6">
            <p className="tnum display m-0 text-[40px] leading-none text-[var(--ink)]">{since}</p>
            <p className="m-0 mt-1.5 text-[15px] font-medium text-[var(--ink-2)]">
              {danaLabel(since)} otkad obveza zaprimanja traje
            </p>
            <p className="mt-3 mb-0 text-[15px] leading-relaxed text-[var(--ink-2)]">
              Klijenti izvan sustava PDV-a dužni su zaprimati i fiskalizirati eRačune od
              1.1.2026., u roku od pet radnih dana po računu. Većina misli da ih se to tiče tek
              2027.
            </p>
            <p className="m-0 mt-3 text-[13px] text-[var(--ink-3)]">NN 89/2025, čl. 41 i čl. 48</p>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-6">
            <p className="tnum display m-0 text-[40px] leading-none text-[var(--ink)]">{days}</p>
            <p className="m-0 mt-1.5 text-[15px] font-medium text-[var(--ink-2)]">
              {danaLabel(days)} do obveze izdavanja
            </p>
            <p className="mt-3 mb-0 text-[15px] leading-relaxed text-[var(--ink-2)]">
              Od 1.1.2027. i klijenti izvan sustava PDV-a moraju izdavati i fiskalizirati
              eRačune. Osamdeset klijenata se ne stigne pripremiti u prosincu.
            </p>
            <p className="m-0 mt-3 text-[13px] text-[var(--ink-3)]">NN 89/2025, čl. 38 i čl. 80</p>
          </div>
        </div>
      </section>

      {/* Što ured dobiva --------------------------------------------------- */}
      <section className="border-t border-[var(--line)] py-14 md:py-16">
        <h2 className="display m-0 text-[30px] text-[var(--ink)] sm:text-[34px]">
          Što ured dobiva
        </h2>
        <ul className="mt-7 mb-0 grid list-none gap-x-10 gap-y-0 p-0 sm:grid-cols-2">
          {[
            [
              "Pregled tko je crven a tko zelen",
              "Svi klijenti na jednom mjestu, poredani po riziku.",
            ],
            [
              "Popis onih kojima obveza već teče",
              "Klijenti izvan sustava PDV-a kojima zaprimanje traje od 1.1.2026.",
            ],
            [
              "Izvještaji s imenom vašeg ureda",
              "Klijent dobiva dokument koji dolazi od vas, ne od stranca.",
            ],
            [
              "Podjela odgovornosti u pisanom obliku",
              "Svaki nalaz imenuje nositelja: vlasnik, knjigovođa ili posrednik.",
            ],
          ].map(([title, sub]) => (
            <li
              key={title}
              className="border-b border-[var(--line)] py-4 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
            >
              <span className="block text-[16px] font-semibold text-[var(--ink)]">{title}</span>
              <span className="mt-0.5 block text-[15px] leading-relaxed text-[var(--ink-3)]">
                {sub}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-9 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-6 md:p-7">
          <h3 className="m-0 text-[18px] font-semibold text-[var(--ink)]">
            Prvo je isprobajte, pa onda razgovarajmo
          </h3>
          <p className="mt-3 mb-0 max-w-2xl text-[16px] leading-relaxed text-[var(--ink-2)]">
            Prođite provjeru za jednog svog klijenta — traje dvije minute, bez registracije.
            Najkorisnije je uzeti klijenta za kojeg ste sigurni da je uredan: ako izađe zeleno,
            imate pisani dokaz da je ured odradio posao.
          </p>
          <Link
            href="/provjera"
            className="mt-5 inline-block rounded-lg bg-[var(--brand)] px-6 py-3 text-[16px] font-semibold text-white no-underline transition-colors hover:bg-[var(--brand-2)]"
          >
            Otvori besplatnu provjeru
          </Link>
        </div>
      </section>

      {/* Oblici suradnje --------------------------------------------------- */}
      <section className="border-t border-[var(--line)] py-14 md:py-16">
        <h2 className="display m-0 text-[30px] text-[var(--ink)] sm:text-[34px]">
          Oblici suradnje
        </h2>
        <p className="mt-4 mb-0 max-w-2xl text-[17px] leading-relaxed text-[var(--ink-2)]">
          Nijedan ne traži da mijenjate program ni postupak. Redom po tome koliko vas koštaju
          vremena.
        </p>

        <ol className="m-0 mt-8 grid list-none gap-4 p-0">
          {[
            [
              "Skupna provjera",
              "Svi klijenti odjednom, izvještaji s imenom ureda i zbirni pregled po riziku.",
              "jednokratno, prema broju klijenata",
            ],
            [
              "Godišnja pretplata za ured",
              "Ponovna provjera svaka tri mjeseca i obavijest kad se propis promijeni.",
              "godišnje",
            ],
            [
              "Preporuka uz proviziju",
              "Šaljete klijente na audit, dobivate udio. Najmanje posla za ured.",
              "po zatvorenom klijentu",
            ],
          ].map(([title, sub, price], i) => (
            <li
              key={title}
              className="flex gap-4 rounded-xl border border-[var(--line)] p-5 md:p-6"
            >
              <span className="tnum mt-[3px] text-[13px] font-semibold text-[var(--ink-3)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">
                <span className="block text-[17px] font-semibold text-[var(--ink)]">{title}</span>
                <span className="mt-1 block text-[16px] leading-relaxed text-[var(--ink-2)]">
                  {sub}
                </span>
                <span className="mt-2 block text-[14px] text-[var(--ink-3)]">{price}</span>
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-6 mb-0 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-3)]">
          Cijenu dogovaramo prema broju klijenata, u razgovoru. Nema pretplate koja se sama
          obnavlja i nema ugovora na rok.
        </p>
      </section>

      {/* Granice ----------------------------------------------------------- */}
      <section className="border-t border-[var(--line)] py-14 md:py-16">
        <h2 className="display m-0 text-[26px] text-[var(--ink)]">Što ovo nije</h2>
        <p className="mt-5 mb-0 max-w-2xl text-[16px] leading-relaxed text-[var(--ink-2)]">
          Nije zamjena za knjigovođu i ne postavlja se kao konkurencija uredu. Alat imenuje
          knjigovođu kao nositelja tamo gdje on to i jest, a dio pitanja izričito upućuje
          informacijskom posredniku i vlasniku.
        </p>
        <p className="mt-4 mb-0 max-w-2xl text-[16px] leading-relaxed text-[var(--ink-2)]">
          Nije ni pravno ni porezno savjetovanje. Provjera koristi javno objavljene propise i
          odgovore obveznika da pokaže gdje su otvoreni koraci; konačnu interpretaciju potvrđuje
          knjigovođa, posrednik ili Porezna uprava.
        </p>
        <p className="mt-4 mb-0 max-w-2xl text-[16px] leading-relaxed text-[var(--ink-2)]">
          I ne kontaktiram vaše klijente. Provjeru šaljete vi, ili je klijent proslijedi sam.
        </p>
      </section>

      <div className="border-t border-[var(--line)] pt-10 pb-16">
        <PartnerSection
          eyebrow="Razgovor bez obveze"
          heading="Recite mi koliko klijenata vodite, pa da vidimo ima li ovo smisla"
          body="Zanima me koliko vaših klijenata nije u sustavu PDV-a — o tome ovisi koji oblik suradnje uopće dolazi u obzir. Javljam se isti ili sljedeći radni dan."
          cta="Javi mi se o partnerstvu"
          defaultOpen
        />
      </div>
    </main>
  );
}
