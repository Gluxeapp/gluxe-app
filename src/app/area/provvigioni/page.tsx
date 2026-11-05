import { Suspense } from "react";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediIncaricataOperativa } from "@/lib/accesso";
import { formatta, formattaEuro } from "@/lib/denaro";
import { calcoloDelMese, ETICHETTE_VOCE, meseCorrente } from "@/lib/provvigioni/dati";
import { TIPI_VOCE } from "@/lib/provvigioni/motore";

export default function Pagina() {
  return (
    <>
      <Titolo sottotitolo="Situazione del mese in corso, calcolata dal server sugli ordini già pagati. Gli importi sono una stima finché il mese non viene chiuso.">
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

      <Scheda>
        <p className="text-sm text-testo-tenue">
          Il mese si chiude il 1° del mese successivo. Dal {p.richiestaDalGiorno} al {p.richiestaAlGiorno} puoi chiedere il pagamento, se il
          saldo è almeno {formattaEuro(p.pagamentoMinimo)}; sotto questa cifra l&apos;importo si somma al mese dopo. Storico dei pagamenti e
          pulsante &quot;Richiedi pagamento&quot; arrivano con la Fase 6.
        </p>
      </Scheda>
    </div>
  );
}
