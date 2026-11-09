import type { documentiProvvigioni } from "@/db/schema";
import { formatta } from "@/lib/denaro";
import { dataItaliana } from "@/lib/dati-incaricato";

/**
 * Foglio della ricevuta o fattura proforma delle provvigioni (docs/piano-compensi.md, sezione 8a),
 * su bianco e pronto da stampare o salvare in PDF. Mostra solo i dati fotografati nel documento.
 */

type Documento = typeof documentiProvvigioni.$inferSelect;
type DatiIncaricata = {
  codice: string;
  nome: string;
  cognome: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  telefono: string;
  email: string;
  codiceFiscale: string;
  partitaIva: string | null;
  iban: string;
};
type DatiAzienda = {
  ragioneSociale: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  codiceFiscale: string;
  partitaIva: string;
  autorizzazioneBollo: string;
};

const TITOLI = {
  ricevuta: "Ricevuta",
  fattura_ordinaria: "Fattura proforma",
  fattura_forfettaria: "Fattura proforma",
} as const;

const OGGETTI = {
  ricevuta: "Emissione ricevuta provvigioni per vendite a domicilio (Legge 173/2005)",
  fattura_ordinaria: "Fattura proforma per provvigioni incaricato vendite a domicilio (Legge 173/2005)",
  fattura_forfettaria: "Fattura proforma per provvigioni incaricato vendite a domicilio (Legge 173/2005)",
} as const;

const euro = (c: bigint) => `${formatta(c)} €`;
const pct = (pb: bigint | number) => `${formatta(BigInt(pb))}%`.replace(",00%", "%");

/** Percentuali della versione dei parametri con cui è nato il documento. */
export type PercentualiDocumento = { ritenutaAliquota: bigint; ritenutaBase: bigint };

function Riga({ etichetta, valore, forte }: { etichetta: string; valore: string; forte?: boolean }) {
  return (
    <div className={`flex justify-between gap-6 py-1.5 ${forte ? "border-t-2 border-black pt-2 text-base font-bold" : ""}`}>
      <span>{etichetta}</span>
      <span className="whitespace-nowrap tabular-nums">{valore}</span>
    </div>
  );
}

export function FoglioDocumento({ documento: d, percentuali: q }: { documento: Documento; percentuali: PercentualiDocumento }) {
  const i = d.incaricata as DatiIncaricata;
  const a = d.azienda as DatiAzienda;
  const ordinaria = d.tipo === "fattura_ordinaria";
  return (
    <article className="mx-auto max-w-[210mm] bg-white p-6 text-[13px] leading-snug text-black shadow-lg print:max-w-none print:p-0 print:shadow-none sm:p-10">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-base font-bold uppercase">
            {i.cognome} {i.nome}
          </p>
          <p>
            {i.indirizzo} – {i.cap} {i.citta} ({i.provincia})
          </p>
          <p>Tel: {i.telefono}</p>
          <p>Email: {i.email}</p>
          <p>Codice fiscale: {i.codiceFiscale}</p>
          <p>Partita IVA: {i.partitaIva ?? ""}</p>
          <p>Codice incaricata: {i.codice}</p>
        </div>
        <div className="sm:text-right">
          <p>Spett.le</p>
          <p className="text-base font-bold">{a.ragioneSociale}</p>
          <p>
            {a.indirizzo} – {a.cap} {a.citta} ({a.provincia})
          </p>
          <p>Codice fiscale: {a.codiceFiscale}</p>
          <p>Partita IVA: {a.partitaIva}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-3 border-y-2 border-black py-2">
        <h1 className="text-lg font-bold uppercase">{TITOLI[d.tipo]}</h1>
        <p>
          N° <strong>{d.numero}/{d.anno}</strong> · Data: <strong>{dataItaliana(d.data)}</strong>
        </p>
      </div>
      <p className="mt-3 font-semibold uppercase">Oggetto: {OGGETTI[d.tipo]}</p>

      <table className="mt-5 w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-black">
            <th className="py-1.5 font-semibold">Descrizione</th>
            <th className="py-1.5 text-right font-semibold">Importo</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-black/30">
            <td className="py-2">Provvigioni maturate · mese di competenza {d.competenza}</td>
            <td className="py-2 text-right tabular-nums">+ {euro(d.imponibile)}</td>
          </tr>
        </tbody>
      </table>

      <div className="ml-auto mt-5 max-w-md">
        <Riga etichetta="Imponibile" valore={euro(d.imponibile)} />
        {ordinaria && <Riga etichetta={`IVA ${pct(d.aliquotaIva)}`} valore={`+ ${euro(d.iva)}`} />}
        <Riga etichetta={`Ritenuta d'imposta a titolo esaustivo del ${pct(q.ritenutaAliquota)} sul ${pct(q.ritenutaBase)}`} valore={`− ${euro(d.ritenuta)}`} />
        {(ordinaria || d.inpsIncaricata > 0n) && (
          <Riga etichetta={`Ritenuta previdenziale INPS gestione separata (su ${euro(d.inpsBase)} oltre la soglia annua)`} valore={`− ${euro(d.inpsIncaricata)}`} />
        )}
        {d.bollo > 0n && <Riga etichetta="Imposta di bollo" valore={`− ${euro(d.bollo)}`} />}
        <Riga etichetta="Totale da pagare" valore={euro(d.totale)} forte />
      </div>

      <div className="mt-8 grid gap-2 text-[12px]">
        {d.tipo === "fattura_forfettaria" && (
          <p>
            Operazione senza applicazione dell&apos;IVA, effettuata ai sensi dell&apos;art. 1, commi da 54 a 89, della Legge n. 190/2014 (regime
            forfettario).
          </p>
        )}
        {d.bollo > 0n && <p>Imposta di bollo assolta in modo virtuale{a.autorizzazioneBollo ? ` – ${a.autorizzazioneBollo}` : ""}.</p>}
        {d.tipo !== "ricevuta" && (
          <p>Documento proforma: la fattura elettronica valida viene emessa dall&apos;incaricata tramite il Sistema di Interscambio, con gli stessi importi.</p>
        )}
        <p className="mt-2">
          <strong>Modalità di pagamento:</strong> bonifico sul conto IBAN {i.iban}
        </p>
      </div>
    </article>
  );
}
