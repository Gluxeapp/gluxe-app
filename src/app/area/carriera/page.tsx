import { Suspense } from "react";
import Link from "next/link";
import { ReteGrafica, ReteLista, SceltaVista, trovaNodo } from "@/components/albero-rete";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediIncaricataOperativa } from "@/lib/accesso";
import { carrieraIncaricata, mesiDisponibili } from "@/lib/carriera";
import { formatta } from "@/lib/denaro";
import { avanzamentoQualifica, contaRete, prossimoTitolo } from "@/lib/rete";

export default function Carriera({ searchParams }: PageProps<"/area/carriera">) {
  return (
    <>
      <Titolo sottotitolo="Qualifica del mese, quanto manca alla prossima e la tua rete. Calcolato dal server sugli ordini già pagati.">
        Carriera
      </Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const NOMI_MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const nomeMese = (m: string) => `${NOMI_MESI[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const pct = (pb: bigint) => `${formatta(pb)}%`.replace(",00%", "%");

async function Contenuto({ searchParams }: Pick<PageProps<"/area/carriera">, "searchParams">) {
  const { incaricato } = await richiediIncaricataOperativa();
  const [{ mese: richiesto, vista: vistaRichiesta, da }, mesi] = await Promise.all([searchParams, mesiDisponibili()]);
  const vista = vistaRichiesta === "lista" ? "lista" : "grafica";
  const mese = typeof richiesto === "string" && mesi.includes(richiesto) ? richiesto : mesi[0];
  const { albero, io, parametri: p, nodoRete } = await carrieraIncaricata(incaricato.id, mese);

  const pgq = io?.pgq ?? 0n;
  const av = avanzamentoQualifica(pgq, p.qualifiche);
  const conteggi = contaRete(nodoRete);
  const titolo = prossimoTitolo(io?.lineeForti ?? 0, p.titoli);
  const attivita = (io?.pp ?? 0n) + (io?.ks ?? 0n);
  // Il grafico può ripartire solo da una persona della propria rete: chiunque altro viene ignorato.
  const partenza = (typeof da === "string" && trovaNodo(albero, da)) || albero;
  const indirizzo = (v: { vista?: string; da?: string }) => {
    const q = new URLSearchParams({ mese, vista: v.vista ?? vista });
    if (v.da) q.set("da", v.da);
    return `/area/carriera?${q}`;
  };

  return (
    <div className="grid gap-4">
      <form className="flex flex-wrap items-end gap-2 text-sm">
        <label className="grid gap-1">
          <span className="text-testo-tenue">Mese</span>
          <select name="mese" defaultValue={mese} className="rounded-lg border border-bordo bg-superficie px-3 py-2">
            {mesi.map((m) => (
              <option key={m} value={m}>
                {nomeMese(m)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-lg border border-oro/60 px-4 py-2 text-oro-chiaro">
          Mostra
        </button>
      </form>

      <Scheda>
        <p className="text-sm text-testo-tenue">Qualifica di {nomeMese(mese)}</p>
        <p className="font-titoli text-3xl text-oro-chiaro">{av.attuale ?? "Nessuna"}</p>
        <p className="mt-1 text-sm">
          Percentuale applicata {pct(io?.percentualeApplicata ?? 0n)}
          {io && io.percentualeApplicata !== io.percentualeReale ? " (qualifica bloccata dall'azienda)" : ""}
          {" · "}
          {io?.attiva ? (
            <span className="text-oro-chiaro">attiva</span>
          ) : (
            <span className="text-testo-tenue">
              non attiva: mancano {formatta(p.sogliaAttivita > attivita ? p.sogliaAttivita - attivita : 0n)} punti personali
            </span>
          )}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-testo-tenue">Personali</p>
            <p className="font-semibold">{formatta(io?.pp ?? 0n)}</p>
          </div>
          <div>
            <p className="text-testo-tenue">Per la qualifica</p>
            <p className="font-semibold">{formatta(io?.ppq ?? 0n)}</p>
          </div>
          <div>
            <p className="text-testo-tenue">Di gruppo</p>
            <p className="font-semibold">{formatta(pgq)}</p>
          </div>
        </div>
      </Scheda>

      <Scheda>
        <h2 className="font-titoli text-xl text-oro-chiaro">Verso la prossima qualifica</h2>
        {av.prossima ? (
          <>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-bordo" role="progressbar" aria-valuenow={av.percentuale} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-oro" style={{ width: `${av.percentuale}%` }} />
            </div>
            <p className="mt-2 text-sm">
              {av.percentuale}% verso <strong>{av.prossima}</strong>: servono {formatta(av.soglia)} punti di gruppo, ne mancano{" "}
              <strong>{formatta(av.mancano)}</strong>.
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm">Hai raggiunto la qualifica più alta del piano.</p>
        )}
        <p className="mt-2 text-xs text-testo-tenue">
          Contano i tuoi punti (gli acquisti intestati a te fino a {formatta(p.tettoAcquistiQualifica)} punti al mese) più quelli di tutta la tua rete.
        </p>
        {io?.leader && (
          <p className="mt-3 text-sm">
            Titolo manager: <strong>{titolo.attuale ?? "nessuno"}</strong> · linee forti {io.lineeForti}
            {titolo.prossimo ? ` · per ${titolo.prossimo} serve ${titolo.lineeMancanti === 1 ? "un'altra linea forte" : `${titolo.lineeMancanti} linee forti in più`}` : ""}.
            <span className="block text-xs text-testo-tenue">
              Linea forte = diretta il cui gruppo arriva a {formatta(p.sogliaLineaForte)} punti.
            </span>
          </p>
        )}
      </Scheda>

      <Scheda>
        <h2 className="font-titoli text-xl text-oro-chiaro">La tua rete</h2>
        <p className="mt-1 text-sm text-testo-tenue">
          {conteggi.persone === 0
            ? "Non hai ancora incaricate nella tua rete."
            : `${conteggi.persone} persone, ${conteggi.dirette} dirette, ${conteggi.livelli} ${conteggi.livelli === 1 ? "livello" : "livelli"}. Telefono ed email si vedono solo per le tue dirette, nella vista Lista.`}
        </p>
        {conteggi.persone > 0 && (
          <div className="mt-3 grid gap-3">
            <SceltaVista attiva={vista} href={(v) => indirizzo({ vista: v, da: v === "grafica" && partenza !== albero ? partenza.id : undefined })} />
            {vista === "lista" ? (
              <ReteLista radice={albero} />
            ) : (
              <>
                {partenza !== albero && (
                  <p className="text-sm">
                    Rete di <strong>{partenza.nome}</strong> ·{" "}
                    <Link href={indirizzo({})} className="text-oro-chiaro">
                      torna alla tua rete
                    </Link>
                  </p>
                )}
                <p className="text-xs text-testo-tenue">
                  In ogni scheda: codice, nome, qualifica e punti personali / di gruppo. Tocca una persona che ha una sua rete per ripartire da lei; scorri di lato se il grafico è largo. Sul telefono si vedono due livelli alla volta: «+N» indica quante persone ci sono sotto.
                </p>
                <ReteGrafica radice={partenza} riparti={(id) => indirizzo({ da: id })} />
              </>
            )}
          </div>
        )}
      </Scheda>
    </div>
  );
}
