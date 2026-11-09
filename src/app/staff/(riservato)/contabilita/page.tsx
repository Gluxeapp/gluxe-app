import Link from "next/link";
import { Suspense } from "react";
import { Avviso, Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { formattaEuro } from "@/lib/denaro";
import { dataItaliana } from "@/lib/dati-incaricato";
import { ETICHETTE_REGIME } from "@/lib/provvigioni/documento";
import { leggiDatiAzienda, quadroContabilita } from "@/lib/provvigioni/conti";
import { ultimoMeseChiuso } from "@/lib/provvigioni/dati";
import { AzioniFile, CreaFile, DecisioneRichiesta, VersamentoF24 } from "./moduli";

export default function Contabilita() {
  return (
    <>
      <Titolo sottotitolo="Richieste di pagamento, ricevute e fatture, file dei bonifici, F24 delle ritenute ed export per il commercialista.">
        Contabilità
      </Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto />
      </Suspense>
    </>
  );
}

const NOMI_MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const nomeMese = (m: string) => `${NOMI_MESI[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const b = (s: string | null) => BigInt(s ?? "0");

function Sezione({ titolo, children, azione }: { titolo: string; children: React.ReactNode; azione?: React.ReactNode }) {
  return (
    <Scheda>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-titoli text-xl text-oro-chiaro">{titolo}</h2>
        {azione}
      </div>
      {children}
    </Scheda>
  );
}

async function Contenuto() {
  await richiediStaff(["amministrazione", "contabilita"]);
  const [q, { mancanti, perBonifici }, ultimo] = await Promise.all([quadroContabilita(), leggiDatiAzienda(), ultimoMeseChiuso()]);
  const da = [...mancanti, ...perBonifici];

  return (
    <div className="grid gap-5">
      {da.length > 0 && (
        <Avviso tipo="errore">
          Mancano dati dell&apos;azienda, necessari per documenti e bonifici: {da.join(", ")}.{" "}
          <Link href="/staff/contabilita/azienda" className="underline">
            Completa i dati
          </Link>
        </Avviso>
      )}

      <Sezione titolo="Richieste da decidere" azione={<Link href="/staff/contabilita/azienda" className="text-sm text-testo-tenue">Dati dell&apos;azienda →</Link>}>
        {q.daDecidere.length === 0 ? (
          <p className="text-sm text-testo-tenue">Nessuna richiesta in attesa.</p>
        ) : (
          <ul className="divide-y divide-bordo">
            {q.daDecidere.map(({ richiesta: r, codice, nome, cognome, regime }) => (
              <li key={r.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-start">
                <div className="text-sm">
                  <p>
                    <strong>
                      {codice} · {nome} {cognome}
                    </strong>
                  </p>
                  <p className="text-testo-tenue">
                    {formattaEuro(r.lordo)} lordi · compensi fino a {nomeMese(r.mese)} · {ETICHETTE_REGIME[regime]} · pagamento il {dataItaliana(r.dataPagamento)}
                  </p>
                </div>
                <DecisioneRichiesta id={r.id} />
              </li>
            ))}
          </ul>
        )}
      </Sezione>

      <Sezione titolo="Bonifici da fare">
        {q.approvate.length === 0 ? (
          <p className="text-sm text-testo-tenue">Nessuna richiesta approvata da pagare.</p>
        ) : (
          <ul className="divide-y divide-bordo">
            {q.approvate.map((a) => (
              <li key={a.dataPagamento} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <p>
                  Pagamento del <strong>{dataItaliana(a.dataPagamento)}</strong>: {a.numero} bonifici per {formattaEuro(b(a.totale))}
                  {a.senzaFile < a.numero && <span className="text-testo-tenue"> ({a.numero - a.senzaFile} già in un file)</span>}
                </p>
                {a.senzaFile > 0 && <CreaFile dataPagamento={a.dataPagamento} />}
              </li>
            ))}
          </ul>
        )}
        {q.distinte.length > 0 && (
          <>
            <h3 className="mt-4 text-sm font-semibold text-testo-tenue">File bonifici</h3>
            <ul className="mt-1 divide-y divide-bordo">
              {q.distinte.map(({ distinta: d, daPagare }) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <p className={d.annullataIl ? "text-testo-tenue line-through" : ""}>
                    {dataItaliana(d.dataPagamento)} · {d.numeroBonifici} bonifici · {formattaEuro(d.totale)}
                    {d.annullataIl ? " · annullato" : daPagare === 0 ? " · pagati" : ""}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <a href={`/staff/contabilita/bonifici/${d.id}`} className="text-oro-chiaro underline">
                      Scarica XML
                    </a>
                    {!d.annullataIl && <AzioniFile id={d.id} pagabile={daPagare > 0} annullabile={daPagare === d.numeroBonifici} />}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Sezione>

      <Sezione titolo="Mese per mese: F24, IVA, INPS e bollo">
        {q.periodi.length === 0 ? (
          <p className="text-sm text-testo-tenue">Ancora nessun documento.</p>
        ) : (
          <div className="grid gap-4">
            {q.periodi.map((p) => (
              <div key={p.periodo} className="rounded-lg border border-bordo p-4 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold capitalize">{nomeMese(p.periodo)}</h3>
                  <div className="flex flex-wrap gap-4">
                    <Link href={`/staff/contabilita/f24/${p.periodo}`} className="text-oro-chiaro underline">
                      F24
                    </Link>
                    <a href={`/staff/contabilita/export?tipo=documenti&mese=${p.periodo}`} className="text-oro-chiaro underline">
                      Export documenti (CSV)
                    </a>
                  </div>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                  {(
                    [
                      ["Documenti", String(p.documenti)],
                      ["Imponibile", formattaEuro(b(p.imponibile))],
                      ["IVA in fattura", formattaEuro(b(p.iva))],
                      ["Ritenute (1038)", formattaEuro(b(p.ritenute))],
                      ["INPS incaricate", formattaEuro(b(p.inpsIncaricate))],
                      ["INPS a carico azienda", formattaEuro(b(p.inpsAzienda))],
                      ["Bolli", formattaEuro(b(p.bollo))],
                      ["Bonifici", formattaEuro(b(p.totale))],
                    ] as const
                  ).map(([e, v]) => (
                    <div key={e}>
                      <dt className="text-testo-tenue">{e}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-bordo pt-3">
                  <p>
                    F24 codice 1038: <strong>{formattaEuro(p.importo)}</strong> entro il {dataItaliana(p.scadenza)}
                    {p.versato && <span className="text-oro-chiaro"> · versato il {dataItaliana(p.versato.versatoIl)}</span>}
                  </p>
                  {!p.versato && p.importo > 0n && <VersamentoF24 periodo={p.periodo} scadenza={p.scadenza} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </Sezione>

      <Sezione titolo="Compensi per il commercialista">
        {ultimo ? (
          <p className="text-sm">
            Compensi per incaricata e per voce, con i dati fiscali, del mese chiuso:{" "}
            <a href={`/staff/contabilita/export?tipo=compensi&mese=${ultimo}`} className="text-oro-chiaro underline">
              {nomeMese(ultimo)} (CSV)
            </a>
            . Per un altro mese chiuso cambia il mese nell&apos;indirizzo del file.
          </p>
        ) : (
          <p className="text-sm text-testo-tenue">Nessun mese ancora chiuso.</p>
        )}
      </Sezione>
    </div>
  );
}
