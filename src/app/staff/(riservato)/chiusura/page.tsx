import Link from "next/link";
import { desc } from "drizzle-orm";
import { Suspense } from "react";
import { db } from "@/db";
import { mesiChiusi } from "@/db/schema";
import { Avviso, Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { formatta, formattaEuro } from "@/lib/denaro";
import { dataOra } from "@/lib/ordini";
import { meseDaChiudere, stornoInSospeso } from "@/lib/provvigioni/chiusura";
import { calcoloDelMese } from "@/lib/provvigioni/dati";
import { ModuloChiusura } from "./modulo";

export default function Chiusura() {
  return (
    <>
      <Titolo sottotitolo="I mesi si chiudono in ordine, dopo la loro fine. Con la chiusura il mese si congela: le voci vanno nel registro provvigioni e le incaricate possono chiedere il pagamento dal 3 al 6.">
        Chiusura del mese
      </Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto />
      </Suspense>
    </>
  );
}

const NOMI_MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const nomeMese = (m: string) => `${NOMI_MESI[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

async function Contenuto() {
  await richiediStaff(["amministrazione"]);
  const [mese, chiusi] = await Promise.all([meseDaChiudere(), db().select().from(mesiChiusi).orderBy(desc(mesiChiusi.mese)).limit(24)]);
  const [e, storni] = mese ? await Promise.all([calcoloDelMese(mese), stornoInSospeso(mese)]) : [null, new Map<string, string[]>()];
  const resi = [...storni.values()].flat().length;

  return (
    <div className="grid gap-5">
      {!mese || !e ? (
        <Avviso>Nessun mese da chiudere adesso: il mese in corso si potrà chiudere dal 1° del mese prossimo.</Avviso>
      ) : (
        <Scheda>
          <h2 className="font-titoli text-2xl capitalize text-oro-chiaro">{nomeMese(mese)}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-testo-tenue">Punti aziendali</dt>
              <dd className="text-lg">{formatta(e.puntiAziendali)}</dd>
            </div>
            <div>
              <dt className="text-testo-tenue">Incasso IVA esclusa</dt>
              <dd className="text-lg">{formattaEuro(e.incasso)}</dd>
            </div>
            <div>
              <dt className="text-testo-tenue">Compensi</dt>
              <dd className="text-lg">{formattaEuro(e.totaleCompensi)}</dd>
            </div>
            <div>
              <dt className="text-testo-tenue">Voci</dt>
              <dd className="text-lg">{e.voci.length}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm">
            <Link href={`/staff/provvigioni?mese=${mese}`} className="text-oro-chiaro underline">
              Guarda l&apos;anteprima completa
            </Link>
            {resi > 0 && ` · Con la chiusura si stornano anche ${resi} ordini resi o annullati dopo la chiusura del loro mese.`}
          </p>
          <div className="mt-4">
            {e.ok ? (
              <ModuloChiusura mese={mese} nome={nomeMese(mese)} />
            ) : (
              <Avviso tipo="errore">
                I controlli non sono superati: il mese non si può chiudere. Problemi:{" "}
                {e.controlli
                  .filter((c) => !c.ok)
                  .map((c) => c.nome + (c.dettaglio ? ` (${c.dettaglio})` : ""))
                  .join("; ")}
                .
              </Avviso>
            )}
          </div>
        </Scheda>
      )}

      <Scheda>
        <h2 className="mb-2 font-titoli text-xl text-oro-chiaro">Mesi chiusi</h2>
        {chiusi.length === 0 ? (
          <p className="text-sm text-testo-tenue">Nessun mese chiuso finora.</p>
        ) : (
          <ul className="divide-y divide-bordo text-sm">
            {chiusi.map((m) => (
              <li key={m.mese} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span className="capitalize">{nomeMese(m.mese)}</span>
                <span className="text-testo-tenue">
                  {formattaEuro(m.totaleCompensi)} · chiuso il {dataOra(m.chiusoIl)}
                </span>
                <a href={`/staff/contabilita/export?tipo=compensi&mese=${m.mese}`} className="text-oro-chiaro underline">
                  Compensi (CSV)
                </a>
              </li>
            ))}
          </ul>
        )}
      </Scheda>
    </div>
  );
}
