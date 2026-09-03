import type { Metadata } from "next";
import Wizard from "./wizard";

export const metadata: Metadata = {
  title: "Provjera spremnosti",
  description:
    "Trinaest pitanja o vašem poslovanju. Rezultat je izvještaj po semaforu s rokovima, člancima zakona i konkretnim sljedećim koracima.",
  robots: { index: false, follow: true },
};

export default function ProvjeraPage() {
  return <Wizard />;
}
