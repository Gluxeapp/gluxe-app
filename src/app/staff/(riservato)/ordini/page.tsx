import Link from "next/link";
import { Suspense } from "react";
import { EtichettaStato } from "@/components/etichetta-stato";
import { Caricamento, Titolo } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { formattaEuro } from "@/lib/denaro";
import { contaOrdiniPerStato, dataOra, elencoOrdiniStaff, ETICHETTE_STATO, numeroOrdine, type StatoOrdine } from "@/lib/ordini";

export default function OrdiniStaff({ searchParams }: PageProps<"/staff/ordini">) {
  return (
    <>
      <Titolo sottotitolo="Lo stato «pagato» arriva da Stripe. Rimborsi e resi si fanno dalla dashboard di Stripe e si aggiornano qui da soli.">
        Ordini
      </Titolo>
      <Suspense fallback={<Caricamento />}>
        <Elenco searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** Filtri nell'ordine in cui lo staff lavora. */
const FILTRI: StatoOrdine[] = ["pagato", "in_preparazione", "spedito", "consegnato", "inserito", "annullato", "reso"];

async function Elenco({ searchParams }: Pick<PageProps<"/staff/ordini">, "searchParams">) {
  await richiediStaff(["amministrazione", "ordini"]);
  const { stato: richiesto } = await searchParams;
  const stato = FILTRI.find((s) => s === richiesto);
  const [elenco, conteggi] = await Promise.all([elencoOrdiniStaff(stato), contaOrdiniPerStato()]);

  return (
    <>
      <nav aria-label="Filtra per stato" className="mb-5 flex flex-wrap gap-2 text-sm">
        <Filtro href="/staff/ordini" attivo={!stato}>
          Tutti
        </Filtro>
        {FILTRI.map((s) => (
          <Filtro key={s} href={`/staff/ordini?stato=${s}`} attivo={stato === s}>
            {ETICHETTE_STATO[s]} ({conteggi[s] ?? 0})
          </Filtro>
        ))}
      </nav>
      <div className="overflow-x-auto rounded-xl border border-bordo">
        <table className="w-full text-left text-sm">
          <thead className="bg-superficie text-testo-tenue">
            <tr>
              <th className="px-4 py-3 font-medium">Ordine</th>
              <th className="px-4 py-3 font-medium">Incaricata</th>
              <th className="px-4 py-3 font-medium">Città</th>
              <th className="px-4 py-3 font-medium">Creato</th>
              <th className="px-4 py-3 text-right font-medium">Totale</th>
              <th className="px-4 py-3 font-medium">Stato</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bordo">
            {elenco.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3">
                  <Link href={`/staff/ordini/${o.id}`} className="text-oro-chiaro">
                    {numeroOrdine(o.numero)}
                  </Link>
                  {o.tipo === "start_kit" && <span className="text-testo-tenue"> · kit</span>}
                </td>
                <td className="px-4 py-3">
                  {o.nome} {o.cognome} <span className="text-testo-tenue">{o.codice}</span>
                </td>
                <td className="px-4 py-3">{o.citta}</td>
                <td className="px-4 py-3 whitespace-nowrap">{dataOra(o.creatoIl)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">{formattaEuro(o.totale)}</td>
                <td className="px-4 py-3">
                  <EtichettaStato stato={o.stato} etichetta={ETICHETTE_STATO[o.stato]} />
                </td>
              </tr>
            ))}
            {elenco.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-testo-tenue">
                  Nessun ordine.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Filtro({ href, attivo, children }: { href: string; attivo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={attivo ? "page" : undefined}
      className={`rounded-full border px-3 py-1 ${attivo ? "border-oro bg-oro text-nero" : "border-bordo text-testo-tenue"}`}
    >
      {children}
    </Link>
  );
}
