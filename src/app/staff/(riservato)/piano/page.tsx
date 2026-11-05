import Link from "next/link";
import { Suspense } from "react";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { dataItaliana } from "@/lib/dati-incaricato";
import { formatta } from "@/lib/denaro";
import { giornoDiOggi } from "@/lib/provvigioni/dati";
import { impostazioniDelPiano } from "@/lib/provvigioni/impostazioni";
import { ModuloBloccata, ModuloEsclusioni, ModuloFondatore, ModuloQuota, RevocaBloccata, TerminaQuota } from "./moduli";

export default function ImpostazioniPiano() {
  return (
    <>
      <Titolo sottotitolo="Impostazioni per persona del Piano Compensi (docs/piano-compensi.md, sezioni 4, 5g e 6). Ogni modifica finisce nel registro modifiche e vale dal calcolo successivo.">
        Impostazioni del piano
      </Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto />
      </Suspense>
    </>
  );
}

const pct = (pb: bigint | number) => `${formatta(BigInt(pb))}%`.replace(",00%", "%");
const punti = (c: bigint) => formatta(c);

function Persona({ codice, nome, cognome }: { codice: string; nome: string; cognome: string }) {
  return (
    <span>
      <span className="text-oro-chiaro">{codice}</span> {nome} {cognome}
    </span>
  );
}

async function Contenuto() {
  const [{ bloccate, fondatori, quote, esclusioni, parametri: p, requisiti }, oggi] = await Promise.all([impostazioniDelPiano(), giornoDiOggi()]);
  const percentuali: [string, string][] = p.qualifiche.map((q) => [formatta(q.percentuale), `${pct(q.percentuale)} · ${q.nome}`]);

  return (
    <div className="grid gap-6">
      <Scheda>
        <h2 className="font-titoli text-xl text-oro-chiaro">Qualifiche bloccate</h2>
        <p className="mt-1 text-sm text-testo-tenue">
          La percentuale applicata è la maggiore tra la qualifica reale e quella bloccata (massimo 20%). Una revoca vale dal mese in cui si fa.
        </p>
        <ul className="mt-3 divide-y divide-bordo text-sm">
          {bloccate.map(({ riga: b, autore, ...persona }) => {
            const stato = b.revocataIl ? "revocata" : b.al && b.al < oggi ? "scaduta" : b.dal > oggi ? "futura" : "in corso";
            return (
              <li key={String(b.id)} className="py-3">
                <Persona {...persona} /> · <strong>{pct(b.percentuale)}</strong> dal {dataItaliana(b.dal)}
                {b.al ? ` al ${dataItaliana(b.al)}` : ", senza scadenza"} · <span className="text-testo-tenue">{stato}</span>
                <p className="text-testo-tenue">
                  {b.motivo}
                  {autore ? ` · impostata da ${autore}` : " · impostata con la migrazione"}
                </p>
                {!b.revocataIl && stato !== "scaduta" && <RevocaBloccata id={String(b.id)} />}
              </li>
            );
          })}
          {bloccate.length === 0 && <li className="py-3 text-testo-tenue">Nessuna.</li>}
        </ul>
        <div className="mt-4 border-t border-bordo pt-4">
          <ModuloBloccata percentuali={percentuali} />
        </div>
      </Scheda>

      <Scheda>
        <h2 className="font-titoli text-xl text-oro-chiaro">
          Leader Fondatori ({fondatori.length} su {p.fondatoriMassimo})
        </h2>
        <p className="mt-1 text-sm text-testo-tenue">
          Per {p.fondatoriDurataMesi} mesi dall&apos;ingresso: qualifica bloccata al {pct(p.fondatoriPercentualeBloccata)} e bonus del{" "}
          {pct(p.fondatoriBonus)} sui punti di gruppo reali, se attiva. Requisito: {punti(p.fondatoriRequisitoPunti)} punti per qualifica in{" "}
          {p.fondatoriRequisitoGiorni} giorni, controllato in automatico.{" "}
          {p.dataLancioPiano
            ? `Ingresso entro ${p.fondatoriMesiIngresso} mesi dal lancio del piano (${dataItaliana(p.dataLancioPiano)}).`
            : "La data di lancio del piano non è ancora impostata nei parametri: il limite di ingresso non viene controllato."}
        </p>
        <ul className="mt-3 divide-y divide-bordo text-sm">
          {fondatori.map(({ riga: f, ...persona }) => {
            const r = requisiti.get(f.incaricatoId);
            const decade = f.decadeDal ?? (r?.decadeDal ? `${r.decadeDal}-01` : null);
            const fine = new Date(`${f.ingresso}T00:00:00Z`);
            fine.setUTCMonth(fine.getUTCMonth() + p.fondatoriDurataMesi);
            const stato = decade
              ? `privilegi decaduti dal ${dataItaliana(decade)} (requisito non raggiunto)`
              : fine.toISOString().slice(0, 10) <= oggi
                ? "periodo di 12 mesi concluso"
                : r && r.punti >= p.fondatoriRequisitoPunti
                  ? "requisito raggiunto"
                  : `requisito in corso fino al ${r ? dataItaliana(r.fineFinestra) : "—"}`;
            return (
              <li key={f.incaricatoId} className="py-3">
                <Persona {...persona} /> · ingresso {dataItaliana(f.ingresso)}
                <p className="text-testo-tenue">
                  Punti per il requisito: {r ? punti(r.punti) : "—"} su {punti(p.fondatoriRequisitoPunti)} · {stato}
                </p>
              </li>
            );
          })}
          {fondatori.length === 0 && <li className="py-3 text-testo-tenue">Nessuna.</li>}
        </ul>
        <div className="mt-4 border-t border-bordo pt-4">
          <ModuloFondatore />
        </div>
      </Scheda>

      <Scheda>
        <h2 className="font-titoli text-xl text-oro-chiaro">Quote sull&apos;incasso aziendale</h2>
        <p className="mt-1 text-sm text-testo-tenue">Master President e quota riservata (sezioni 5e-bis, 5f e 6). Una quota non si cancella: si fa finire in una data.</p>
        <ul className="mt-3 divide-y divide-bordo text-sm">
          {quote.map(({ riga: q, ...persona }) => (
            <li key={String(q.id)} className="py-3">
              <Persona {...persona} /> · {q.tipo === "master_president" ? "Master President" : "Quota riservata"} ·{" "}
              <strong>{pct(q.percentuale)}</strong> dell&apos;incasso · {q.soloSeAttiva ? "solo se attiva" : "anche se inattiva"}
              <p className="text-testo-tenue">
                Dal {dataItaliana(q.dal)}
                {q.al ? ` al ${dataItaliana(q.al)}` : ", senza scadenza"}
              </p>
              {(!q.al || q.al >= oggi) && <TerminaQuota id={String(q.id)} />}
            </li>
          ))}
          {quote.length === 0 && <li className="py-3 text-testo-tenue">Nessuna.</li>}
        </ul>
        <div className="mt-4 border-t border-bordo pt-4">
          <ModuloQuota />
        </div>
      </Scheda>

      <Scheda>
        <h2 className="font-titoli text-xl text-oro-chiaro">Escluse da pool e bonus auto</h2>
        <ul className="mt-3 divide-y divide-bordo text-sm">
          {esclusioni.map((e) => (
            <li key={e.codice} className="py-2">
              <Persona {...e} /> · pool: {e.esclusaPool ? "esclusa" : "sì"} · bonus auto: {e.esclusaBonusAuto ? "esclusa" : "sì"}
            </li>
          ))}
          {esclusioni.length === 0 && <li className="py-2 text-testo-tenue">Nessuna.</li>}
        </ul>
        <div className="mt-4 border-t border-bordo pt-4">
          <ModuloEsclusioni />
        </div>
      </Scheda>

      <p className="text-sm text-testo-tenue">
        Per cambiare percentuali e soglie per tutte vai ai <Link href="/staff/parametri" className="text-oro-chiaro">parametri del piano</Link>.
      </p>
    </div>
  );
}
