import Link from "next/link";
import { daysUntil2027, danaLabel, todayISO, formatHr } from "@/lib/date";

// Odbrojavanje mora biti točno; osvježi jednom na sat.
export const revalidate = 3600;

export default function Home() {
  const today = todayISO();
  const days = daysUntil2027(today);

  return (
    <main className="mx-auto max-w-5xl px-5">
      {/* Hero ------------------------------------------------------------ */}
      <section className="grid gap-10 py-14 md:grid-cols-[1.35fr_1fr] md:gap-14 md:py-20">
        <div>
          <p className="m-0 text-[13px] font-semibold uppercase tracking-[0.09em] text-[var(--brand)]">
            Fiskalizacija 2.0 · eRačun
          </p>
          <h1 className="display mt-4 mb-0 text-[42px] text-[var(--ink)] sm:text-[54px] md:text-[60px]">
            Znate li točno što se od eRačuna odnosi baš na vas?
          </h1>
          <p className="mt-6 mb-0 max-w-xl text-[19px] leading-relaxed text-[var(--ink-2)]">
            Besplatna provjera u dvije minute. Dobijete izvještaj po semaforu: što je kritično,
            koji su rokovi, tko je odgovoran za koji korak i što treba pitati knjigovođu — s
            člankom zakona uz svaku tvrdnju.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/provjera"
              className="rounded-lg bg-[var(--brand)] px-6 py-3.5 text-[16px] font-semibold text-white no-underline shadow-[0_1px_2px_rgba(11,18,32,0.16)] transition-colors hover:bg-[var(--brand-2)]"
            >
              Pokreni besplatnu provjeru
            </Link>
            <span className="text-[14px] text-[var(--ink-3)]">
              Bez registracije. Bez e-maila. Rezultat odmah.
            </span>
          </div>
        </div>

        <aside className="self-start rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-6">
          <p className="m-0 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-3)]">
            Sljedeći rok
          </p>
          <p className="tnum display m-0 mt-3 text-[52px] leading-none text-[var(--ink)]">
            {days}
          </p>
          <p className="m-0 mt-1 text-[15px] font-medium text-[var(--ink-2)]">
            {danaLabel(days)} do 1.1.2027.
          </p>
          <hr className="my-5 border-0 border-t border-[var(--line-2)]" />
          <p className="m-0 text-[15px] leading-relaxed text-[var(--ink-2)]">
            Od 1.1.2027. i obveznici <strong className="font-semibold">izvan sustava PDV-a</strong>{" "}
            moraju izdavati i fiskalizirati eRačune. Obveza ne ovisi o broju izdanih računa ni o
            veličini obrta.
          </p>
          <p className="m-0 mt-4 text-[13px] text-[var(--ink-3)]">
            Zakon o fiskalizaciji, NN 89/2025, čl. 38 i čl. 80
          </p>
        </aside>
      </section>

      {/* Tri promašaja ---------------------------------------------------- */}
      <section className="border-t border-[var(--line)] py-14 md:py-16">
        <h2 className="display m-0 max-w-2xl text-[32px] text-[var(--ink)] sm:text-[38px]">
          Tri stvari koje se najčešće promaše
        </h2>
        <p className="mt-4 mb-0 max-w-2xl text-[17px] text-[var(--ink-2)]">
          Ne zato što su ljudi nemarni, nego zato što sve tri izgledaju kao da su riješene.
        </p>

        <div className="mt-9 grid gap-4 md:grid-cols-3">
          <Misconception
            wrong="„Nisam u PDV-u, mene se to tiče tek 2027.”"
            right="Obveza izdavanja počinje 1.1.2027. Ali obveza zaprimanja i fiskalizacije primljenih eRačuna vrijedi već od 1.1.2026. Rok za fiskalizaciju je pet radnih dana od primitka."
            legal="NN 89/2025, čl. 41 i čl. 48"
          />
          <Misconception
            wrong="„Knjigovođa je to riješio.”"
            right="Ovlaštenje informacijskom posredniku potvrđuje obveznik kroz FiskAplikaciju u ePoreznoj. Posrednik odgovara za ispravnost programskog rješenja, ali zakonska obveza ostaje na vama."
            legal="NN 89/2025, čl. 58"
          />
          <Misconception
            wrong="„Šaljem PDF e-mailom, to je e-račun.”"
            right="eRačun mora biti u strukturiranom elektroničkom obliku koji se obrađuje automatski, bez ručnog unosa. PDF, Word i Excel predlošci ne prolaze."
            legal="NN 89/2025, čl. 38"
          />
        </div>
      </section>

      {/* Što dobijete ------------------------------------------------------ */}
      <section className="border-t border-[var(--line)] py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1fr_1.15fr] md:gap-14">
          <div>
            <h2 className="display m-0 text-[32px] text-[var(--ink)] sm:text-[38px]">
              Što provjera pokriva
            </h2>
            <p className="mt-4 mb-0 text-[17px] leading-relaxed text-[var(--ink-2)]">
              Devet područja, ista ona po kojima se obveza stvarno provjerava. Svaki nalaz dolazi
              s rokom, nositeljem, konkretnim sljedećim korakom i člankom zakona — a gdje postoji
              prekršaj, i s rasponom novčane kazne za vaš pravni oblik.
            </p>
            <p className="mt-5 mb-0 text-[15px] text-[var(--ink-3)]">
              Izvještaj se otvara na vlastitoj poveznici koju možete poslati knjigovođi ili
              ispisati.
            </p>
          </div>

          <ol className="m-0 grid list-none gap-x-8 gap-y-0 p-0 sm:grid-cols-2">
            {[
              ["Opseg obveze", "što i od kojeg datuma vrijedi za vas"],
              ["Zaprimanje eRačuna", "je li kanal stvarno otvoren"],
              ["Izdavanje eRačuna", "proizvodi li vaš alat pravi eRačun"],
              ["Fiskalizacija", "pet radnih dana, izdani i primljeni"],
              ["Posrednik i pristup", "posrednik, MikroeRačun, FiskAplikacija"],
              ["Adresa u adresaru", "AMS — može li vas izdavatelj naći"],
              ["KPD 2025", "šesteroznamenkasta oznaka po stavci"],
              ["eIzvještavanje", "odbijanja i naplata do 20. u mjesecu"],
              ["Interni proces", "tko klikne kad ste na terenu"],
            ].map(([title, sub], i) => (
              <li
                key={title}
                className="flex gap-3.5 border-b border-[var(--line)] py-3.5 last:border-b-0"
              >
                <span className="tnum mt-[3px] text-[13px] font-semibold text-[var(--ink-3)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block text-[16px] font-semibold text-[var(--ink)]">{title}</span>
                  <span className="block text-[14px] text-[var(--ink-3)]">{sub}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Ponuda ------------------------------------------------------------ */}
      <section className="border-t border-[var(--line)] py-14 md:py-16">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-7 md:p-10">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:gap-12">
            <div>
              <p className="m-0 text-[13px] font-semibold uppercase tracking-[0.09em] text-[var(--brand)]">
                Kad provjera pokaže da treba ruka
              </p>
              <h2 className="display mt-3 mb-0 text-[30px] text-[var(--ink)] sm:text-[34px]">
                Workflow audit za obrte i male firme
              </h2>
              <p className="mt-4 mb-0 max-w-lg text-[17px] leading-relaxed text-[var(--ink-2)]">
                Besplatna provjera vam kaže <em>što</em> nije riješeno. Audit prolazi kroz vaš
                stvarni proces i zatvara korake dok ne ostane nijedan crveni: mapiranje stavki na
                KPD 2025, provjera ovlaštenja i adrese, pisani popis pitanja za knjigovođu i
                posrednika, i mjesečni postupak koji netko konkretno vodi.
              </p>
              <ul className="mt-6 mb-0 list-none space-y-2.5 p-0 text-[16px] text-[var(--ink-2)]">
                {[
                  "Razgovor od 30 minuta kroz vaš stvarni tok računa",
                  "KPD 2025 worksheet sa spornim stavkama izdvojenima",
                  "Pisani popis pitanja za knjigovođu i za posrednika",
                  "Mjesečni postupak s imenovanim nositeljem i zamjenom",
                  "Ponovna provjera nakon provedbe — da vidite zeleno",
                ].map((x) => (
                  <li key={x} className="flex gap-3">
                    <span aria-hidden className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-[var(--brand)]" />
                    {x}
                  </li>
                ))}
              </ul>
            </div>

            <div className="self-start rounded-lg border border-[var(--line-2)] bg-[var(--surface)] p-6">
              <p className="display m-0 text-[40px] leading-none text-[var(--ink)]">99 €</p>
              <p className="m-0 mt-2 text-[15px] text-[var(--ink-3)]">
                Jednokratno. Bez pretplate.
              </p>
              <p className="mt-5 mb-0 text-[15px] leading-relaxed text-[var(--ink-2)]">
                Ako nakon uvodnog razgovora zaključimo da vam ne mogu pomoći, ne naplaćujem
                ništa.
              </p>
              <Link
                className="mt-6 block rounded-lg bg-[var(--brand)] px-5 py-3 text-center text-[16px] font-semibold text-white no-underline transition-colors hover:bg-[var(--brand-2)]"
                href="/provjera"
              >
                Prvo napravite provjeru
              </Link>
              <p className="m-0 mt-4 text-center text-[14px] leading-relaxed text-[var(--ink-3)]">
                Ako provjera pokaže da je sve uredno, audit vam ne treba — i neću vam ga
                nuditi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Knjigovođe ---------------------------------------------------------- */}
      <section className="border-t border-[var(--line)] py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1fr_1fr] md:gap-14">
          <div>
            <p className="m-0 text-[13px] font-semibold uppercase tracking-[0.09em] text-[var(--brand)]">
              Za knjigovodstvene urede
            </p>
            <h2 className="display mt-3 mb-0 text-[30px] text-[var(--ink)] sm:text-[34px]">
              Jedan ured, sto istih razgovora
            </h2>
            <p className="mt-4 mb-0 text-[17px] leading-relaxed text-[var(--ink-2)]">
              Klijenti vam postavljaju isto pitanje na sto načina, a najviše onih koji nisu u
              sustavu PDV-a i misle da ih se to tiče tek 2027. Umjesto da svakom objašnjavate
              isto, mogu napraviti provjeru za sve vaše klijente odjednom.
            </p>
          </div>
          <ul className="m-0 list-none space-y-3.5 p-0 text-[16px] text-[var(--ink-2)]">
            {[
              "Pregled tko je crven a tko zelen, na jednom mjestu",
              "Popis klijenata kojima obveza zaprimanja teče od 1.1.2026., poredan po riziku",
              "Izvještaji s vašim imenom i kontaktom",
              "Skupna priprema za 1.1.2027. umjesto sto pojedinačnih razgovora",
            ].map((x) => (
              <li key={x} className="flex gap-3">
                <span aria-hidden className="mt-[10px] h-[5px] w-[5px] shrink-0 rounded-full bg-[var(--brand)]" />
                {x}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-8 mb-0 text-[16px]">
          <a
            className="font-semibold text-[var(--brand)] underline decoration-[var(--line-2)] underline-offset-[3px] transition-colors hover:decoration-[var(--brand)]"
            href="mailto:ivan@faitech.hr?subject=Partnerski%20program%20za%20knjigovodstveni%20ured"
          >
            Javite se o partnerskom programu
          </a>
        </p>
      </section>

      {/* Izvori i granice --------------------------------------------------- */}
      <section className="border-t border-[var(--line)] py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 md:gap-14">
          <div>
            <h2 className="display m-0 text-[26px] text-[var(--ink)]">Odakle dolaze tvrdnje</h2>
            <ul className="mt-5 mb-0 list-none space-y-3 p-0 text-[15px]">
              {[
                ["Zakon o fiskalizaciji, NN 89/2025", "https://narodne-novine.nn.hr/clanci/sluzbeni/full/2025_06_89_1233.html"],
                ["Porezna uprava — eRačun", "https://porezna.gov.hr/fiskalizacija/bezgotovinski-racuni/eracun"],
                ["Porezna uprava — izdavatelji i primatelji eRačuna", "https://porezna-uprava.gov.hr/hr/izdavatelji-i-primatelji-eracuna-te-obveza-izdavanja-eracuna-azurirano-7-11-2025/8048"],
                ["KLASUS — pretraživanje KPD 2025, DZS", "https://klasus.dzs.hr/"],
              ].map(([label, url]) => (
                <li key={url}>
                  <a
                    className="text-[var(--brand)] underline decoration-[var(--line-2)] underline-offset-[3px] transition-colors hover:decoration-[var(--brand)]"
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-5 mb-0 text-[14px] text-[var(--ink-3)]">
              Sadržaj izvora zadnji put provjeren {formatHr("2026-09-03")}
            </p>
          </div>

          <div>
            <h2 className="display m-0 text-[26px] text-[var(--ink)]">Granice</h2>
            <p className="mt-5 mb-0 text-[16px] leading-relaxed text-[var(--ink-2)]">
              Ovo nije pravno ni porezno savjetovanje i ne zamjenjuje knjigovođu. Provjera koristi
              javno objavljene propise i vaše odgovore da pokaže gdje su otvoreni koraci. Konačnu
              interpretaciju za vaš konkretan slučaj potvrđuje knjigovođa, informacijski posrednik
              ili Porezna uprava.
            </p>
            <p className="mt-4 mb-0 text-[16px] leading-relaxed text-[var(--ink-2)]">
              Odgovori se ne spremaju osim ako sami ne zatražite da vam pošaljem plan.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Misconception({
  wrong,
  right,
  legal,
}: {
  wrong: string;
  right: string;
  legal: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-[var(--line)] p-6">
      <p className="m-0 text-[17px] font-semibold leading-snug text-[var(--ink-3)] line-through decoration-[var(--kriticno)] decoration-2">
        {wrong}
      </p>
      <p className="mt-4 mb-0 flex-1 text-[16px] leading-relaxed text-[var(--ink-2)]">{right}</p>
      <p className="m-0 mt-5 border-t border-[var(--line)] pt-4 text-[13px] font-medium text-[var(--ink-3)]">
        {legal}
      </p>
    </div>
  );
}
