import Link from "next/link";
import { Suspense } from "react";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { riepilogo } from "@/lib/dati-staff";
import { contaOrdiniPerStato } from "@/lib/ordini";

export default function RiepilogoStaff() {
  return (
    <Suspense fallback={<Caricamento />}>
      <Contenuto />
    </Suspense>
  );
}

const AREE = { amministrazione: "Area amministrazione", contabilita: "Area contabilità", ordini: "Area ordini" };

async function Contenuto() {
  const staff = await richiediStaff();
  const vedeOrdini = staff.ruolo === "amministrazione" || staff.ruolo === "ordini";
  const [numeri, ordini] = await Promise.all([
    staff.ruolo === "ordini" ? undefined : riepilogo(),
    vedeOrdini ? contaOrdiniPerStato() : undefined,
  ]);

  const riquadri = [
    ...(ordini
      ? [
          { etichetta: "Ordini da preparare", valore: ordini.pagato ?? 0, href: "/staff/ordini?stato=pagato" },
          { etichetta: "In preparazione", valore: ordini.in_preparazione ?? 0, href: "/staff/ordini?stato=in_preparazione" },
          { etichetta: "Spediti, da consegnare", valore: ordini.spedito ?? 0, href: "/staff/ordini?stato=spedito" },
        ]
      : []),
    ...(numeri
      ? [
          { etichetta: "Incaricati attivi", valore: numeri.incaricatiAttivi, href: "/staff/incaricati" },
          { etichetta: "Nuovi negli ultimi 30 giorni", valore: numeri.nuoviUltimi30Giorni, href: "/staff/incaricati" },
          { etichetta: "Richieste sponsor da gestire", valore: numeri.richiesteNuove, href: "/staff/richieste" },
        ]
      : []),
  ];
  const conCollegamento = (href: string) =>
    staff.ruolo === "amministrazione" || (staff.ruolo === "ordini" && href.startsWith("/staff/ordini"));

  return (
    <>
      <Titolo sottotitolo={AREE[staff.ruolo]}>Ciao {staff.nome}</Titolo>
      <div className="grid gap-4 sm:grid-cols-3">
        {riquadri.map((r) =>
          conCollegamento(r.href) ? (
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
