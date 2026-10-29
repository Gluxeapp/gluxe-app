import Link from "next/link";
import { Suspense } from "react";
import { esci } from "@/app/azioni/accesso";
import { richiediStaff, type RuoloStaff } from "@/lib/accesso";

const voci: { href: string; etichetta: string; ruoli: RuoloStaff[] }[] = [
  { href: "/staff", etichetta: "Riepilogo", ruoli: ["amministrazione", "contabilita", "ordini"] },
  { href: "/staff/ordini", etichetta: "Ordini", ruoli: ["amministrazione", "ordini"] },
  { href: "/staff/incaricati", etichetta: "Incaricati", ruoli: ["amministrazione"] },
  { href: "/staff/catalogo", etichetta: "Catalogo", ruoli: ["amministrazione"] },
  { href: "/staff/catalogo/promozioni", etichetta: "Promozioni", ruoli: ["amministrazione"] },
  { href: "/staff/parametri", etichetta: "Parametri del piano", ruoli: ["amministrazione"] },
  { href: "/staff/richieste", etichetta: "Richieste sponsor", ruoli: ["amministrazione"] },
  { href: "/staff/registro", etichetta: "Registro modifiche", ruoli: ["amministrazione"] },
];

export default function LayoutStaff({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-bordo bg-superficie">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link href="/staff" className="font-titoli text-2xl font-semibold testo-oro">
            G LUXE <span className="text-base text-testo-tenue">· Staff</span>
          </Link>
          <form action={esci}>
            <button type="submit" className="text-sm text-testo-tenue">
              Esci
            </button>
          </form>
        </div>
        <Suspense fallback={<div className="h-8" />}>
          <Menu />
        </Suspense>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">{children}</main>
    </div>
  );
}

/** Ogni ruolo vede solo le sue voci; le pagine controllano comunque il ruolo da sole. */
async function Menu() {
  const { ruolo } = await richiediStaff();
  return (
    <nav aria-label="Area staff" className="mx-auto flex max-w-5xl gap-5 overflow-x-auto px-5 pb-3 text-sm">
      {voci
        .filter((v) => v.ruoli.includes(ruolo))
        .map((v) => (
          <Link key={v.href} href={v.href} className="whitespace-nowrap text-testo-tenue hover:text-oro-chiaro">
            {v.etichetta}
          </Link>
        ))}
    </nav>
  );
}
