import Link from "next/link";
import { Suspense } from "react";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediIncaricataOperativa } from "@/lib/accesso";
import { formatta, formattaEuro } from "@/lib/denaro";
import { dataItaliana } from "@/lib/dati-incaricato";
import { contoIncaricata, statoRichiesta } from "@/lib/provvigioni/conti";
import { PulsanteRichiesta } from "./richiesta";
import { calcoloDelMese, ETICHETTE_VOCE, meseCorrente } from "@/lib/provvigioni/dati";
import { TIPI_VOCE } from "@/lib/provvigioni/motore";
import { margineDellAnno } from "@/lib/provvigioni/margine";

export default function Pagina() {
  return (
    <>
      <Titolo sottotitolo="Situazione del mese in corso (una stima finché il mese non viene chiuso), saldo dei mesi chiusi e richieste di pagamento.">
        Provvigioni
      </Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto />
      </Suspense>
    </>
  );
}

const punti = (c: bigint) => formatta(c);
const pct = (pb: bigint) => `${formatta(pb)}%`.replace(",00%", "%");
const NOMI_MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

async function Contenuto() {
  const { incaricato } = await richiediIncaricataOperativa();
  const mese = await meseCorrente();
  const e = await calcoloDelMese(mese);
  const p = e.parametri;

  // Solo i dati di chi è collegata: della rete non si mostra nulla qui (CLAUDE.md, regola 15).
  const io = e.situazioni.find((s) => s.id === incaricato.id);
  const mie = e.voci.filter((v) => v.beneficiariaId === incaricato.id);
  const perVoce = TIPI_VOCE.map((t) => [t, mie.filter((v) => v.tipo === t).reduce((s, v) => s + v.importo, 0n)] as const).filter(([, x]) => x !== 0n);
  const totale = mie.reduce((s, v) => s + v.importo, 0n);

  const pgq = io?.pgq ?? 0n;
  const prossima = [...p.qualifiche].sort((a, b) => (a.soglia < b.soglia ? -1 : 1)).find((q) => q.soglia > pgq);
  const avanzamento = prossima ? Number((pgq * 100n) / prossima.soglia) : 100;
  const attivita = (io?.pp ?? 0n) + (io?.ks ?? 0n);
  const nomeMese = `${NOMI_MESI[Number(mese.slice(5, 7)) - 1]} ${mese.slice(0, 4)}`;

  return (
    <div className="grid gap-4">
      <Scheda>
        <p className="text-sm text-testo-tenue">Mese di {nomeMese}</p>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-testo-tenue">Punti personali</p>
            <p className="font-titoli text-2xl text-oro-chiaro">{punti(io?.pp ?? 0n)}</p>
          </div>
          <div>
            <p className="text-testo-tenue">Punti per la qualifica</p>
            <p className="font-titoli text-2xl text-oro-chiaro">{punti(io?.ppq ?? 0n)}</p>
          </div>
        </div>
        <p className="mt-3 text-sm">
          {io?.attiva ? (
            <span className="text-oro-chiaro">Sei attiva questo mese.</span>
          ) : (
            <span className="text-testo-tenue">
              Non sei ancora attiva: ti mancano {punti(p.sogliaAttivita - attivita > 0n ? p.sogliaAttivita - attivita : 0n)} punti (servono{" "}
              {punti(p.sogliaAttivita)} punti nel mese).
            </span>
          )}
        </p>
      </Scheda>

      <Scheda>
        <p className="text-sm text-testo-tenue">Punti di gruppo per la qualifica</p>
        <p className="font-titoli text-2xl text-oro-chiaro">{punti(pgq)}</p>
        <p className="mt-2 text-sm">
          Qualifica: <strong>{io?.qualificaReale ?? "nessuna"}</strong> · percentuale applicata {pct(io?.percentualeApplicata ?? 0n)}
        </p>
        {prossima ? (
          <>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-bordo" aria-hidden>
              <div className="h-full bg-oro" style={{ width: `${avanzamento}%` }} />
            </div>
            <p className="mt-2 text-sm text-testo-tenue">
              {avanzamento}% verso {prossima.nome} ({punti(prossima.soglia)} punti): ne mancano {punti(prossima.soglia - pgq)}.
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-testo-tenue">Hai raggiunto la qualifica più alta.</p>
        )}
        {io?.leader && (
          <p className="mt-2 text-sm">
            Titolo manager: <strong>{io.titolo ?? "nessuno"}</strong> · linee forti {io.lineeForti}
          </p>
        )}
      </Scheda>

      <Scheda>
        <h2 className="mb-2 font-titoli text-xl text-oro-chiaro">Stima dei compensi del mese</h2>
        {perVoce.length === 0 ? (
          <p className="text-sm text-testo-tenue">Ancora nessun compenso questo mese.</p>
        ) : (
          <dl className="grid gap-1 text-sm">
            {perVoce.map(([t, importo]) => (
              <div key={t} className="flex justify-between gap-4">
                <dt className="text-testo-tenue">{ETICHETTE_VOCE[t]}</dt>
                <dd>{formattaEuro(importo)}</dd>
              </div>
            ))}
            <div className="mt-1 flex justify-between gap-4 border-t border-bordo pt-2 font-semibold">
              <dt>Totale stimato</dt>
              <dd>{formattaEuro(totale)}</dd>
            </div>
          </dl>
        )}
      </Scheda>

      <Suspense fallback={<Caricamento />}>
        <Margine incaricataId={incaricato.id} mese={mese} />
      </Suspense>

      <Suspense fallback={<Caricamento />}>
        <Conto incaricataId={incaricato.id} />
      </Suspense>
    </div>
  );
}

/** Guadagno stimato rivendendo a prezzo di listino gli acquisti personali con lo sconto: solo informativo. */
async function Margine({ incaricataId, mese }: { incaricataId: string; mese: string }) {
  const anno = Number(mese.slice(0, 4));
  const { mesi, totale } = await margineDellAnno(incaricataId, anno);
  const delMese = mesi.find(([m]) => m === mese)?.[1] ?? 0n;
  const precedenti = mesi.filter(([m]) => m !== mese);

  return (
    <Scheda>
      <h2 className="font-titoli text-xl text-oro-chiaro">Guadagno stimato dagli acquisti personali</h2>
      <p className="mt-1 text-sm text-testo-tenue">
        Quanto guadagni se rivendi a prezzo di listino i prodotti comprati con lo sconto del 40%. È una stima: non è una
        provvigione, non entra nel saldo e non si chiede in pagamento.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-testo-tenue">Mese di {nomeMeseDi(mese)}</p>
          <p className="font-titoli text-2xl text-oro-chiaro">{formattaEuro(delMese)}</p>
        </div>
        <div>
          <p className="text-testo-tenue">Da inizio {anno}</p>
          <p className="font-titoli text-2xl text-oro-chiaro">{formattaEuro(totale)}</p>
        </div>
      </div>
      {precedenti.length > 0 && (
        <dl className="mt-3 grid gap-1 border-t border-bordo pt-2 text-sm">
          {precedenti.map(([m, x]) => (
            <div key={m} className="flex justify-between gap-4">
              <dt className="capitalize text-testo-tenue">{nomeMeseDi(m)}</dt>
              <dd>{formattaEuro(x)}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-3 text-xs text-testo-tenue">
        Contano gli ordini personali pagati (non annullati né resi). Prodotti in promozione e start kit non hanno lo sconto, quindi non
        sono compresi.
      </p>
    </Scheda>
  );
}

const STATI_RICHIESTA ={ richiesta: "In controllo", approvata: "Approvata, in pagamento", rifiutata: "Rifiutata", pagata: "Pagata" } as const;
const ETICHETTE_MOVIMENTO = { storno: "Storno per resi", richiesta: "Richiesta di pagamento", richiesta_rifiutata: "Richiesta rifiutata: importo restituito" } as const;
const nomeMeseDi = (m: string) => `${NOMI_MESI[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

/** Saldo, richiesta di pagamento, documenti e registro dei mesi chiusi: solo i dati dell'incaricata collegata. */
async function Conto({ incaricataId }: { incaricataId: string }) {
  const [s, conto] = await Promise.all([statoRichiesta(incaricataId), contoIncaricata(incaricataId)]);
  const mesi = [...new Set(conto.movimenti.map((m) => m.mese))];

  return (
    <>
      <Scheda>
        <h2 className="font-titoli text-xl text-oro-chiaro">Saldo disponibile</h2>
        <p className={`font-titoli text-3xl ${s.saldo < 0n ? "text-errore" : "text-oro-chiaro"}`}>{formattaEuro(s.saldo)}</p>
        <p className="mt-1 text-sm text-testo-tenue">Compensi dei mesi chiusi non ancora chiesti, al lordo della ritenuta.</p>
        <div className="mt-4">
          {s.puoRichiedere ? (
            <>
              <PulsanteRichiesta importo={formattaEuro(s.saldo)} />
              <p className="mt-2 text-sm text-testo-tenue">
                Il pagamento arriva con bonifico il {dataItaliana(s.dataPagamento)}, al netto della ritenuta (ed eventuale bollo).
              </p>
            </>
          ) : (
            <p className="text-sm text-testo-tenue">
              {s.giaRichiesta
                ? "Hai già chiesto il pagamento di questo mese: trovi la richiesta qui sotto."
                : !s.finestra
                  ? `Il pagamento si chiede dal ${s.dal} al ${s.al} di ogni mese, dopo la chiusura del mese precedente.`
                  : !s.meseAppenaChiuso
                    ? "La sede non ha ancora chiuso il mese scorso: il pulsante compare appena lo chiude."
                    : `Servono almeno ${formattaEuro(s.minimo)}: il saldo si somma ai mesi successivi.`}
            </p>
          )}
        </div>
      </Scheda>

      {conto.richieste.length > 0 && (
        <Scheda>
          <h2 className="mb-2 font-titoli text-xl text-oro-chiaro">Richieste e documenti</h2>
          <ul className="divide-y divide-bordo text-sm">
            {conto.richieste.map(({ richiesta: r, documentoId, numero, anno, totale }) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p>
                    {formattaEuro(r.lordo)} lordi · {STATI_RICHIESTA[r.stato]}
                  </p>
                  <p className="text-testo-tenue">
                    Chiesta il {dataItaliana(r.creatoIl)}
                    {totale !== null && ` · bonifico di ${formattaEuro(totale)} il ${dataItaliana(r.dataPagamento)}`}
                    {r.stato === "rifiutata" && r.motivoRifiuto && ` · motivo: ${r.motivoRifiuto}`}
                  </p>
                </div>
                {documentoId && (
                  <Link href={`/area/provvigioni/documento/${documentoId}`} className="text-oro-chiaro underline">
                    Documento n. {numero}/{anno}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Scheda>
      )}

      {mesi.length > 0 && (
        <Scheda>
          <h2 className="mb-2 font-titoli text-xl text-oro-chiaro">Mesi chiusi, voce per voce</h2>
          <div className="grid gap-4">
            {mesi.map((mese) => {
              const del = conto.movimenti.filter((m) => m.mese === mese);
              const voci = TIPI_VOCE.map((t) => [t, del.filter((m) => m.tipo === "voce" && m.tipoVoce === t).reduce((x, m) => x + m.importo, 0n)] as const).filter(([, x]) => x !== 0n);
              const altri = (["storno", "richiesta", "richiesta_rifiutata"] as const)
                .map((t) => [t, del.filter((m) => m.tipo === t).reduce((x, m) => x + m.importo, 0n)] as const)
                .filter(([, x]) => x !== 0n);
              return (
                <div key={mese}>
                  <h3 className="text-sm font-semibold capitalize">{nomeMeseDi(mese)}</h3>
                  <dl className="mt-1 grid gap-1 text-sm">
                    {voci.map(([t, x]) => (
                      <div key={t} className="flex justify-between gap-4">
                        <dt className="text-testo-tenue">{ETICHETTE_VOCE[t]}</dt>
                        <dd>{formattaEuro(x)}</dd>
                      </div>
                    ))}
                    {altri.map(([t, x]) => (
                      <div key={t} className="flex justify-between gap-4">
                        <dt className="text-testo-tenue">{ETICHETTE_MOVIMENTO[t]}</dt>
                        <dd>{formattaEuro(x)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
          </div>
        </Scheda>
      )}
    </>
  );
}
