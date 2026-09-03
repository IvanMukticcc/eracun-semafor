# eRačun Semafor

Besplatna provjera spremnosti za eRačun / Fiskalizaciju 2.0, na hrvatskom.

Trinaest pitanja izvode pravni profil obveznika, a deterministički rules engine
vraća izvještaj po semaforu: što vrijedi i od kojeg datuma, što nedostaje, rok
i nositelj za svaki korak, članak zakona iza svake tvrdnje, raspon novčane
kazne za taj pravni oblik, i gotova pitanja za knjigovođu i posrednika.

## Pokretanje

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm test     # engine + codec
pnpm check    # tsc --noEmit && test
pnpm build
```

## Arhitektura

```
src/lib/rules/          jezgra — čista, deterministička, testirana
  types.ts              domenski tipovi
  sources.ts            katalog primarnih izvora s datumom provjere
  questions.ts          upitnik i grananje
  engine.ts             profil obveznika → nalazi
  handoff.ts            nalazi → pitanja za knjigovođu i posrednika
src/lib/codec.ts        odgovori ⇄ token u URL-u
src/app/                landing, čarobnjak, izvještaj, API za prijave
supabase/migrations/    shema tablice leads
```

**Pravilo koje se ne krši: nijedan model nije u putu pravne tvrdnje.**
Isti odgovori uvijek daju isti izvještaj. To je uvjet da se nalaz može braniti
pred knjigovođom, i razlog zašto je engine čista funkcija bez mrežnih poziva.

Činjenična podloga je `../briefs/fiskalizacija-2-0-cinjenice.md`, provjerena
prema Poreznoj upravi i NN 89/2025 dana 3.9.2026. Kad se propis promijeni,
mijenja se taj dokument, pa `sources.ts` (uključujući `checkedOn`), pa pravila
u `engine.ts` — tim redom.

## Odluke koje izgledaju kao propusti, a nisu

- **Samo svijetla tema.** Kupac je obrtnik na mobitelu; jedan besprijekoran
  izgled je bolji od dva osrednja. `color-scheme: light` je postavljen
  namjerno, ne slučajno.
- **Odgovori u URL-u, ne u bazi.** Izvještaj se šalje knjigovođi bez računa i
  bez prijave. Kodiraju se eksplicitne vrijednosti, ne indeksi izbora, da
  stara poveznica nikad ne promijeni značenje.
- **Sažetak za bazu izvodi se na serveru iz tokena.** Klijent ne šalje ocjenu —
  inače bi je svatko mogao izmisliti.
- **Bez PDF biblioteke.** `@media print` daje isti rezultat, ispravno se
  prelama i ne dodaje ovisnost koja mora pratiti hrvatske dijakritike.

## Produkcija

| | |
|---|---|
| Sajt | https://eracun-semafor.vercel.app |
| Operativa | `/ops?k=…` — ključ je u `.env.local`, i u Vercel varijablama |
| Vercel | projekt `eracun-semafor`, tim `swift-ui-van-s-projects` |
| Supabase | projekt `eracun-semafor`, ref `bkprysaporiizwfrizzd`, regija `eu-central-1` |

Deploy: `vercel --prod`. Varijable se postavljaju samo za `production`
(`vercel env ls`), namjerno — vidi napomenu u `.env.local`.

Migracije iz `supabase/migrations/` su primijenjene. Sve četiri tablice imaju
RLS uključen **bez ijedne policy**, što je provjereno i s vanjske strane:
`anon` ključem `SELECT` vraća prazno, a `INSERT` pada s
`new row violates row-level security policy`. Jedini put do podataka je server
sa service role ključem.

## Okolina

Vidi `.env.example`. Bez Supabase varijabli sve radi osim spremanja prijava —
obrazac tada javlja korisniku pošteno stanje umjesto da pukne.
