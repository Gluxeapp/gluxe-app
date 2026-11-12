import { Suspense } from "react";
import { Avviso, Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediIncaricataOperativa } from "@/lib/accesso";
import { formattaEuro } from "@/lib/denaro";
import { dataItaliana } from "@/lib/dati-incaricato";
import { prodottoLicenza, situazioneLicenza } from "@/lib/licenze";
import { pagamentiAttivi } from "@/lib/stripe";
import { PulsanteRinnovo } from "./rinnovo";

export default function PaginaLicenza() {
  return (
    <>
      <Titolo sottotitolo="La licenza per usare l'app vale 12 mesi dal pagamento dello start kit e si rinnova ogni anno.">Licenza</Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto />
      </Suspense>
    </>
  );
}

async function Contenuto() {
  const { incaricato } = await richiediIncaricataOperativa();
  const [s, prodotto] = await Promise.all([situazioneLicenza(incaricato.id), prodottoLicenza()]);
  const prezzo = formattaEuro(prodotto.prezzoListino);

  return (
    <div className="grid gap-4">
      <Scheda>
        {s.stato === "senza_scadenza" ? (
          <p className="text-sm">{s.esente ? "La tua licenza non scade." : "La tua licenza non ha ancora una scadenza: partirà dalla data di lancio del piano."}</p>
        ) : (
          <>
            <p className="text-sm text-testo-tenue">{s.stato === "scaduta" || s.stato === "decaduta" ? "Scaduta il" : "Valida fino al"}</p>
            <p className={`font-titoli text-3xl ${s.stato === "scaduta" || s.stato === "decaduta" ? "text-errore" : "text-oro-chiaro"}`}>
              {dataItaliana(s.validaFino)}
            </p>
            {s.stato === "valida" && (
              <p className="mt-2 text-sm text-testo-tenue">Potrai rinnovarla dal {dataItaliana(s.rinnovabileDal)}: ti avviseremo via email.</p>
            )}
            {s.stato === "in_scadenza" && (
              <p className="mt-2 text-sm">Puoi rinnovarla già adesso: la nuova scadenza parte dalla vecchia, non perdi nessun giorno.</p>
            )}
            {s.stato === "scaduta" && (
              <div className="mt-3">
                <Avviso tipo="errore">
                  L&apos;app è in sola visualizzazione: non puoi ordinare e il tuo negozio è chiuso. Puoi rinnovare fino al{" "}
                  {dataItaliana(s.rinnovabileFino)}: se non rinnovi, la tua squadra e i tuoi clienti passano alla tua sponsor. I mesi che si
                  chiudono con la licenza scaduta non maturano provvigioni.
                </Avviso>
              </div>
            )}
          </>
        )}

        {s.rinnovabile && (
          <div className="mt-4">
            {pagamentiAttivi() ? (
              <PulsanteRinnovo prezzo={prezzo} />
            ) : (
              <Avviso>Il pagamento online sarà attivo a breve.</Avviso>
            )}
            <p className="mt-2 text-xs text-testo-tenue">
              {prezzo} IVA inclusa, con carta, PayPal o Klarna. Il rinnovo non dà punti: l&apos;importo va all&apos;azienda.
            </p>
          </div>
        )}
      </Scheda>

      {s.periodi.length > 0 && (
        <Scheda>
          <h2 className="mb-2 font-titoli text-xl text-oro-chiaro">Pagamenti della licenza</h2>
          <ul className="divide-y divide-bordo text-sm">
            {s.periodi.map((x) => (
              <li key={x.ordineId} className="flex justify-between gap-3 py-2">
                <span>Pagata il {dataItaliana(x.pagatoIl)}</span>
                <span className="text-testo-tenue">
                  {dataItaliana(x.dal)} → {dataItaliana(x.validaFino)}
                </span>
              </li>
            ))}
          </ul>
        </Scheda>
      )}
    </div>
  );
}
