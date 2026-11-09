import { Suspense } from "react";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { formatta } from "@/lib/denaro";
import { calcoloDelMese, MESE_VALIDO, meseCorrente, reteCompleta } from "@/lib/provvigioni/dati";
import { quoteVendite } from "@/lib/vendite";

/** Vendite a clienti finali (sezione 10): quota dei punti ON sui PP del mese, per incaricata e per la sua rete. */
export default function Vendite({ searchParams }: PageProps<"/staff/vendite">) {
  return (
    <>
      <Titolo sottotitolo="Quota dei punti dal negozio online (ON) sul totale dei punti personali (PP) del mese, per ogni incaricata e per la sua rete (lei più tutta la downline).">
        Vendite a clienti finali
      </Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const quota = (q: bigint | null) => (q === null ? "—" : `${formatta(q)}%`.replace(",00%", "%"));

async function Contenuto({ searchParams }: Pick<PageProps<"/staff/vendite">, "searchParams">) {
  await richiediStaff(["amministrazione", "contabilita"]);
  const { mese: richiesto } = await searchParams;
  const mese = typeof richiesto === "string" && MESE_VALIDO.test(richiesto) ? richiesto : await meseCorrente();
  const [e, rete] = await Promise.all([calcoloDelMese(mese), reteCompleta()]);

  const punti = new Map(e.situazioni.map((s) => [s.id, { on: s.on, pp: s.pp }]));
  const quote = quoteVendite(
    rete.map((r) => ({ id: r.id, sponsorId: r.sponsor_id })),
    punti,
  );
  const totaleOn = e.situazioni.reduce((t, s) => t + s.on, 0n);
  const totalePp = e.situazioni.reduce((t, s) => t + s.pp, 0n);
  const aziendale = quoteVendite([{ id: "tutte", sponsorId: null }], new Map([["tutte", { on: totaleOn, pp: totalePp }]])).get("tutte")!;
  const righe = rete
    .map((r) => ({ ...r, q: quote.get(r.id)! }))
    .filter((r) => r.q.ppRete > 0n)
    .sort((a, b) => a.codice.localeCompare(b.codice));

  return (
    <div className="grid gap-5">
      <form className="flex flex-wrap items-end gap-3 text-sm">
        <label className="grid gap-1">
          <span className="text-testo-tenue">Mese</span>
          <input type="month" name="mese" defaultValue={mese} className="rounded-lg border border-bordo bg-superficie px-3 py-2" />
        </label>
        <button type="submit" className="rounded-lg border border-oro/60 px-4 py-2 text-oro-chiaro">
          Mostra
        </button>
        {e.chiuso && <span className="text-testo-tenue">Mese chiuso: dati congelati alla chiusura.</span>}
      </form>

      <div className="grid gap-4 sm:grid-cols-3">
        <Scheda>
          <p className="text-sm text-testo-tenue">Punti ON (negozio)</p>
          <p className="font-titoli text-2xl text-oro-chiaro">{formatta(totaleOn)}</p>
        </Scheda>
        <Scheda>
          <p className="text-sm text-testo-tenue">Punti personali (PP)</p>
          <p className="font-titoli text-2xl text-oro-chiaro">{formatta(totalePp)}</p>
        </Scheda>
        <Scheda>
          <p className="text-sm text-testo-tenue">Quota vendite a clienti finali</p>
          <p className="font-titoli text-2xl text-oro-chiaro">{quota(aziendale.quota)}</p>
        </Scheda>
      </div>

      <Scheda className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-testo-tenue">
            <tr className="border-b border-bordo">
              <th className="p-3">Incaricata</th>
              <th className="p-3 text-right">ON</th>
              <th className="p-3 text-right">PP</th>
              <th className="p-3 text-right">Quota</th>
              <th className="p-3 text-right">ON rete</th>
              <th className="p-3 text-right">PP rete</th>
              <th className="p-3 text-right">Quota rete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bordo">
            {righe.map((r) => (
              <tr key={r.id}>
                <td className="p-3">
                  {r.nome} <span className="text-xs text-testo-tenue">{r.codice}</span>
                </td>
                <td className="p-3 text-right">{formatta(r.q.on)}</td>
                <td className="p-3 text-right">{formatta(r.q.pp)}</td>
                <td className="p-3 text-right font-semibold">{quota(r.q.quota)}</td>
                <td className="p-3 text-right">{formatta(r.q.onRete)}</td>
                <td className="p-3 text-right">{formatta(r.q.ppRete)}</td>
                <td className="p-3 text-right font-semibold">{quota(r.q.quotaRete)}</td>
              </tr>
            ))}
            {righe.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-testo-tenue">
                  Nessun punto nel mese.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Scheda>
      <p className="text-xs text-testo-tenue">
        Punti reali, senza tetto. Rete secondo gli sponsor di oggi. Senza punti personali la quota non si calcola (—).
      </p>
    </div>
  );
}
