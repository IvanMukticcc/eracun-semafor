import type { Area, Severity } from "./rules/types";

export const SEVERITY_LABEL: Record<Severity, string> = {
  kriticno: "Kritično",
  rizik: "Rizik",
  provjeri: "Za provjeru",
  ok: "Uredno",
};

export const SEVERITY_SUMMARY: Record<Severity, string> = {
  kriticno: "Obveza koja je već na snazi, a ne ispunjavate je.",
  rizik: "Radi se, ali ne pouzdano — probit će se prvi put kad zapne.",
  provjeri: "Treba potvrditi da bi se moglo tvrditi da je riješeno.",
  ok: "Nema otvorenih koraka po ovoj stavci.",
};

export const AREA_LABEL: Record<Area, string> = {
  opseg: "Opseg obveze",
  zaprimanje: "Zaprimanje eRačuna",
  izdavanje: "Izdavanje eRačuna",
  fiskalizacija: "Fiskalizacija",
  posrednik: "Posrednik i pristup",
  ams: "Adresa u adresaru",
  kpd: "KPD 2025",
  eizvjestavanje: "eIzvještavanje",
  proces: "Interni proces",
};

export const AREA_ORDER: Area[] = [
  "opseg",
  "zaprimanje",
  "izdavanje",
  "fiskalizacija",
  "posrednik",
  "ams",
  "kpd",
  "eizvjestavanje",
  "proces",
];
