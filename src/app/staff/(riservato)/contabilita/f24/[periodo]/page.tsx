import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PulsanteStampa } from "@/components/pulsante-stampa";
import { Avviso, Caricamento } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { formatta } from "@/lib/denaro";
import { dataItaliana } from "@/lib/dati-incaricato";
import { f24DelPeriodo, leggiDatiAzienda } from "@/lib/provvigioni/conti";
import { MESE_VALIDO } from "@/lib/provvigioni/dati";

/** F24 compilato in automatico con le ritenute dei pagamenti del mese (sezione 8b). */
export default function PaginaF24({ params }: PageProps<"/staff/contabilita/f24/[periodo]">) {
  return (
    <Suspense fallback={<Caricamento />}>
      <Contenuto params={params} />
    </Suspense>
  );
}

const NOMI_MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

function Casella({ etichetta, valore, className = "" }: { etichetta: string; valore: string; className?: string }) {
  return (
    <div className={`border border-black px-2 py-1 ${className}`}>
      <p className="text-[9px] uppercase tracking-wide">{etichetta}</p>
      <p className="min-h-5 font-mono text-sm font-semibold">{valore}</p>
    </div>
  );
}

async function Contenuto({ params }: Pick<PageProps<"/staff/contabilita/f24/[periodo]">, "params">) {
  await richiediStaff(["amministrazione", "contabilita"]);
  const { periodo } = await params;
  if (!MESE_VALIDO.test(periodo)) notFound();
  const [f, { azienda, mancanti }] = await Promise.all([f24DelPeriodo(periodo), leggiDatiAzienda()]);
  const importo = formatta(f.importo);
  const nomeMese = `${NOMI_MESI[Number(periodo.slice(5, 7)) - 1]} ${periodo.slice(0, 4)}`;

  return (
    <div className="grid gap-4">
      <div className="non-stampare flex flex-wrap items-center justify-between gap-3">
        <Link href="/staff/contabilita" className="text-sm text-testo-tenue">
          ← Contabilità
        </Link>
        <PulsanteStampa />
      </div>
      {mancanti.length > 0 && (
        <div className="non-stampare">
          <Avviso tipo="errore">Mancano dati dell&apos;azienda ({mancanti.join(", ")}): completali in Contabilità → Dati dell&apos;azienda.</Avviso>
        </div>
      )}
      <div className="non-stampare">
        <Avviso>
          Ritenute dei pagamenti di {nomeMese}. Da versare entro il <strong>{dataItaliana(f.scadenza)}</strong> con l&apos;F24 dell&apos;home banking
          (sezione Erario), ricopiando questi dati. Il modo di compilare il mese di riferimento va confermato con il commercialista.
          {f.versato && ` Versato il ${dataItaliana(f.versato.versatoIl)}.`}
        </Avviso>
      </div>

      <article className="mx-auto w-full max-w-[210mm] bg-white p-6 text-[12px] text-black shadow-lg print:max-w-none print:p-0 print:shadow-none sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-black pb-2">
          <h1 className="text-xl font-bold">Modello F24</h1>
          <p>Delega irrevocabile · scadenza {dataItaliana(f.scadenza)}</p>
        </div>

        <h2 className="mt-4 bg-black px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white">Contribuente</h2>
        <div className="mt-1 grid gap-1 sm:grid-cols-3">
          <Casella etichetta="Codice fiscale" valore={azienda.codiceFiscale || azienda.partitaIva} />
          <Casella etichetta="Cognome, denominazione o ragione sociale" valore={azienda.ragioneSociale} className="sm:col-span-2" />
          <Casella etichetta="Domicilio fiscale: comune" valore={azienda.citta} className="sm:col-span-2" />
          <Casella etichetta="Prov." valore={azienda.provincia} />
          <Casella etichetta="Via e numero civico" valore={azienda.indirizzo} className="sm:col-span-3" />
        </div>

        <h2 className="mt-4 bg-black px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white">Sezione Erario</h2>
        <table className="mt-1 w-full border-collapse text-left">
          <thead>
            <tr className="text-[9px] uppercase">
              <th className="border border-black px-2 py-1 font-normal">Codice tributo</th>
              <th className="border border-black px-2 py-1 font-normal">Rateazione/regione/prov./mese rif.</th>
              <th className="border border-black px-2 py-1 font-normal">Anno di riferimento</th>
              <th className="border border-black px-2 py-1 text-right font-normal">Importi a debito versati</th>
              <th className="border border-black px-2 py-1 text-right font-normal">Importi a credito compensati</th>
            </tr>
          </thead>
          <tbody className="font-mono text-sm font-semibold">
            <tr>
              <td className="border border-black px-2 py-2">{f.codiceTributo}</td>
              <td className="border border-black px-2 py-2">{f.meseRiferimento}</td>
              <td className="border border-black px-2 py-2">{f.annoRiferimento}</td>
              <td className="border border-black px-2 py-2 text-right">{importo}</td>
              <td className="border border-black px-2 py-2 text-right"></td>
            </tr>
            <tr>
              <td colSpan={3} className="border border-black px-2 py-2 text-right text-[10px] font-normal uppercase">
                Totale A / B
              </td>
              <td className="border border-black px-2 py-2 text-right">{importo}</td>
              <td className="border border-black px-2 py-2 text-right">0,00</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-3 flex justify-end">
          <Casella etichetta="Saldo finale (€)" valore={importo} className="min-w-48 text-right" />
        </div>

        <h2 className="mt-6 text-[11px] font-bold uppercase tracking-wide">Pagamenti che compongono il versamento</h2>
        <table className="mt-1 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-black">
              <th className="py-1 font-semibold">Data</th>
              <th className="py-1 font-semibold">Documento</th>
              <th className="py-1 font-semibold">Incaricata</th>
              <th className="py-1 text-right font-semibold">Imponibile</th>
              <th className="py-1 text-right font-semibold">Ritenuta</th>
            </tr>
          </thead>
          <tbody>
            {f.documenti.map(({ documento: d }) => (
              <tr key={d.id} className="border-b border-black/20">
                <td className="py-1">{dataItaliana(d.data)}</td>
                <td className="py-1">
                  {d.numero}/{d.anno}
                </td>
                <td className="py-1">{(d.incaricata as { codice: string }).codice}</td>
                <td className="py-1 text-right tabular-nums">{formatta(d.imponibile)}</td>
                <td className="py-1 text-right tabular-nums">{formatta(d.ritenuta)}</td>
              </tr>
            ))}
            {f.documenti.length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 text-center">
                  Nessun pagamento in questo mese.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </article>
    </div>
  );
}
