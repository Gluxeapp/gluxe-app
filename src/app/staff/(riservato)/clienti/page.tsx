import Link from "next/link";
import { Suspense } from "react";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { elencoClienti } from "@/lib/clienti";
import { ETICHETTE_MOTIVO } from "@/lib/clienti-fittizi";
import { formattaEuro } from "@/lib/denaro";

/** Clienti del negozio online con le segnalazioni dei possibili clienti fittizi (amministrazione e contabilità). */
export default function Clienti({ searchParams }: PageProps<"/staff/clienti">) {
  return (
    <>
      <Titolo sottotitolo="Clienti del negozio online e incaricata a cui sono legati. In evidenza i possibili clienti fittizi.">
        Clienti
      </Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Contenuto({ searchParams }: Pick<PageProps<"/staff/clienti">, "searchParams">) {
  await richiediStaff(["amministrazione", "contabilita"]);
  const { filtro } = await searchParams;
  const tutti = await elencoClienti();
  const segnalati = tutti.filter((c) => c.motivi.length > 0);
  const elenco = filtro === "segnalati" ? segnalati : tutti;

  return (
    <>
      <nav className="mb-4 flex gap-4 text-sm">
        <Link href="/staff/clienti" className={filtro !== "segnalati" ? "text-oro-chiaro" : "text-testo-tenue"}>
          Tutti ({tutti.length})
        </Link>
        <Link href="/staff/clienti?filtro=segnalati" className={filtro === "segnalati" ? "text-oro-chiaro" : "text-testo-tenue"}>
          Da controllare ({segnalati.length})
        </Link>
      </nav>
      <Scheda className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-testo-tenue">
            <tr className="border-b border-bordo">
              <th className="p-3">Cliente</th>
              <th className="p-3">Incaricata</th>
              <th className="p-3 text-right">Ordini</th>
              <th className="p-3 text-right">Totale</th>
              <th className="p-3">Controllo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bordo">
            {elenco.map((c) => (
              <tr key={c.id}>
                <td className="p-3">
                  <Link href={`/staff/clienti/${c.id}`} className="text-oro-chiaro">
                    {c.nome} {c.cognome}
                  </Link>
                  <span className="block text-xs text-testo-tenue">{c.email}</span>
                </td>
                <td className="p-3">
                  {c.incaricata} <span className="text-xs text-testo-tenue">{c.codice}</span>
                </td>
                <td className="p-3 text-right">{c.ordini}</td>
                <td className="p-3 text-right whitespace-nowrap">{formattaEuro(c.totale)}</td>
                <td className="p-3 text-xs">
                  {c.motivi.length === 0 ? (
                    <span className="text-testo-tenue">ok</span>
                  ) : (
                    <span className="text-errore">{c.motivi.map((m) => ETICHETTE_MOTIVO[m]).join(", ")}</span>
                  )}
                </td>
              </tr>
            ))}
            {elenco.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-testo-tenue">
                  Nessun cliente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Scheda>
      <p className="mt-3 text-xs text-testo-tenue">
        Controllo: confronto con l&apos;incaricata a cui il cliente è legato (indirizzo di consegna, metodo di pagamento,
        email, telefono). È solo una segnalazione: punti e provvigioni non cambiano.
      </p>
    </>
  );
}
