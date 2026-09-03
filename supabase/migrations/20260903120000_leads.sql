-- Prijave s izvještaja eRačun Semafora.
--
-- Tablica je namjerno uska: samo ono što treba da se čovjeku može odgovoriti i
-- da se vidi koji segment dolazi. Sirovi odgovori žive u tokenu, koji je isti
-- onaj iz poveznice na izvještaj — bez njega se ne može rekonstruirati ništa.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  email text not null,
  name text,
  phone text,

  -- Kodirani odgovori iz URL-a izvještaja; omogućuje ponovno otvaranje istog nalaza.
  answers_token text,

  -- Sažetak, izveden na serveru iz tokena. Klijentu se ne vjeruje.
  legal_form text,
  vat_status text,
  category text,
  overall text,
  score int,
  critical_count int,
  risk_count int,

  source text not null default 'eracun-semafor',

  -- Ručno vođenje prodaje.
  status text not null default 'novi',
  note text,

  constraint leads_email_format check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'),
  constraint leads_overall_valid check (overall is null or overall in ('kriticno','rizik','provjeri','ok')),
  constraint leads_score_range check (score is null or (score >= 0 and score <= 100))
);

-- Ista adresa ne treba dvaput; ponovna prijava se u API-ju tiho prihvaća.
create unique index if not exists leads_email_key on public.leads (lower(email));
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_overall_idx on public.leads (overall);

-- RLS uključen bez ijedne policy: anon i authenticated ključ ne mogu ništa.
-- Upis ide isključivo kroz server route sa service role ključem, koji RLS zaobilazi.
alter table public.leads enable row level security;

comment on table public.leads is
  'Prijave s besplatne provjere eRačun spremnosti. Pisanje samo preko servera (service role).';
