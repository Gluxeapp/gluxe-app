import Link from "next/link";
import { Suspense } from "react";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { riepilogo } from "@/lib/dati-staff";

export default function RiepilogoStaff() {
  return (
    <Suspense fallback={<Caricamento />}>
      <Contenuto />
    </Suspense>
  );
}

async function Contenuto() {
  const staff = await richiediStaff();
  const numeri = await riepilogo();
  const riquadri = [
    { etichetta: "Incaricati attivi", valore: numeri.incaricatiAttivi, href: "/staff/incaricati" },
    { etichetta: "Nuovi negli ultimi 30 giorni", valore: numeri.nuoviUltimi30Giorni, href: "/staff/incaricati" },
    { etichetta: "Richieste sponsor da gestire", valore: numeri.richiesteNuove, href: "/staff/richieste" },
  ];
  return (
    <>
      <Titolo sottotitolo={staff.ruolo === "contabilita" ? "Area contabilità" : "Area amministrazione"}>
        Ciao {staff.nome}
      </Titolo>
      <div className="grid gap-4 sm:grid-cols-3">
        {riquadri.map((r) =>
          staff.ruolo === "amministrazione" ? (
            <Link key={r.etichetta} href={r.href}>
              <Riquadro {...r} />
            </Link>
          ) : (
            <Riquadro key={r.etichetta} {...r} />
          ),
        )}
      </div>
      {staff.ruolo === "contabilita" && (
        <Scheda className="mt-6">
          <p className="text-testo-tenue">Richieste di pagamento, ritenute ed export arriveranno nella Fase 6.</p>
        </Scheda>
      )}
    </>
  );
}

function Riquadro({ etichetta, valore }: { etichetta: string; valore: number }) {
  return (
    <Scheda>
      <p className="text-sm text-testo-tenue">{etichetta}</p>
      <p className="mt-2 font-titoli text-4xl text-oro-chiaro">{valore}</p>
    </Scheda>
  );
}
