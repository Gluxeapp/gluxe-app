import { Suspense } from "react";
import { Avviso, Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { formatta, formattaEuro } from "@/lib/denaro";
import { calcoloDelMese, ETICHETTE_VOCE, MESE_VALIDO, meseCorrente } from "@/lib/provvigioni/dati";
import { TIPI_VOCE } from "@/lib/provvigioni/motore";

export default function AnteprimaProvvigioni({ searchParams }: PageProps<"/staff/provvigioni">) {
  return (
    <>
      <Titolo sottotitolo="Calcolo del Piano Compensi sugli ordini pagati del mese. È un'anteprima: si rifà ogni volta che apri la pagina e non scrive nulla. La chiusura del mese arriva con la Fase 6.">
        Anteprima provvigioni
      </Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const punti = (c: bigint) => formatta(c);
const pct = (pb: bigint) => `${formatta(pb)}%`.replace(",00%", "%");

async function Contenuto({ searchParams }: Pick<PageProps<"/staff/provvigioni">, "searchParams">) {
  await richiediStaff(["amministrazione"]);
  const { mese: richiesto } = await searchParams;
  const mese = typeof richiesto === "string" && MESE_VALIDO.test(richiesto) ? richiesto : await meseCorrente();
  const e = await calcoloDelMese(mese);

  const totaliPerVoce = TIPI_VOCE.map((t) => [t, e.voci.filter((v) => v.tipo === t).reduce((s, v) => s + v.importo, 0n)] as const).filter(
    ([, totale]) => totale !== 0n,
  );
  const perIncaricata = new Map<string, bigint>();
  for (const v of e.voci) perIncaricata.set(v.beneficiariaId, (perIncaricata.get(v.beneficiariaId) ?? 0n) + v.importo);
  const righe = e.situazioni
    .filter((s) => s.pp > 0n || s.pgq > 0n || perIncaricata.has(s.id))
    .sort((a, b) => (e.nomi.get(a.id)?.codice ?? "").localeCompare(e.nomi.get(b.id)?.codice ?? ""));

  return (
    <div className="grid gap-5">
      <form className="flex flex-wrap items-end gap-3 text-sm">
        <label className="grid gap-1">
          <span className="text-testo-tenue">Mese</span>
          <input type="month" name="mese" defaultValue={mese} className="rounded-lg border border-bordo bg-superficie px-3 py-2" />
        </label>
        <button type="submit" className="rounded-lg border border-oro/60 px-4 py-2 text-oro-chiaro">
          Calcola
        </button>
        <span className="text-testo-tenue">Parametri: versione n. {e.versioneParametri.toString()}</span>
      </form>

      {e.ok ? (
        <Avviso tipo="ok">Tutti i controlli sono superati.</Avviso>
      ) : (
        <Avviso tipo="errore">
          Alcuni controlli non tornano: con questi dati il mese non si potrebbe chiudere.
          <ul className="mt-2 list-disc pl-5">
            {e.controlli
              .filter((c) => !c.ok)
              .map((c) => (
                <li key={c.nome}>
                  {c.nome}
                  {c.dettaglio ? `: ${c.dettaglio}` : ""}
                </li>
              ))}
          </ul>
        </Avviso>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Scheda>
          <p className="text-sm text-testo-tenue">Punti aziendali</p>
          <p className="font-titoli text-2xl text-oro-chiaro">{punti(e.puntiAziendali)}</p>
        </Scheda>
        <Scheda>
          <p className="text-sm text-testo-tenue">Incasso IVA esclusa</p>
          <p className="font-titoli text-2xl text-oro-chiaro">{formattaEuro(e.incasso)}</p>
        </Scheda>
        <Scheda>
          <p className="text-sm text-testo-tenue">Compensi del mese</p>
          <p className="font-titoli text-2xl text-oro-chiaro">{formattaEuro(e.totaleCompensi)}</p>
        </Scheda>
      </div>

      {totaliPerVoce.length > 0 && (
        <Scheda>
          <h2 className="mb-2 font-titoli text-xl text-oro-chiaro">Totali per voce</h2>
          <dl className="grid gap-1 text-sm">
            {totaliPerVoce.map(([t, totale]) => (
              <div key={t} className="flex justify-between gap-4">
                <dt className="text-testo-tenue">{ETICHETTE_VOCE[t]}</dt>
                <dd>{formattaEuro(totale)}</dd>
              </div>
            ))}
          </dl>
        </Scheda>
      )}

      <div className="overflow-x-auto rounded-xl border border-bordo">
        <table className="w-full text-left text-sm">
          <thead className="bg-superficie text-testo-tenue">
            <tr>
              <th className="px-4 py-3 font-medium">Incaricata</th>
              <th className="px-4 py-3 text-right font-medium">Punti personali</th>
              <th className="px-4 py-3 text-right font-medium">Punti di gruppo (qualifica)</th>
              <th className="px-4 py-3 font-medium">Attiva</th>
              <th className="px-4 py-3 font-medium">Qualifica</th>
              <th className="px-4 py-3 font-medium">Titolo</th>
              <th className="px-4 py-3 text-right font-medium">Compensi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bordo">
            {righe.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3">
                  {e.nomi.get(s.id)?.codice} · {e.nomi.get(s.id)?.nome}
                </td>
                <td className="px-4 py-3 text-right">{punti(s.pp)}</td>
                <td className="px-4 py-3 text-right">{punti(s.pgq)}</td>
                <td className="px-4 py-3">{s.attiva ? "Sì" : "No"}</td>
                <td className="px-4 py-3">
                  {s.qualificaReale ?? "—"}
                  {s.percentualeApplicata !== s.percentualeReale ? ` (applicata ${pct(s.percentualeApplicata)})` : ` ${pct(s.percentualeApplicata)}`}
                </td>
                <td className="px-4 py-3">{s.titolo ? `${s.titolo} (${s.lineeForti} linee forti)` : "—"}</td>
                <td className="px-4 py-3 text-right">{formattaEuro(perIncaricata.get(s.id) ?? 0n)}</td>
              </tr>
            ))}
            {righe.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-testo-tenue">
                  Nessun ordine pagato nel mese.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
