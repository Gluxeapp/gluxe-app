"use client";

import { useActionState } from "react";
import { nuovaVersioneParametri } from "@/app/azioni/piano";
import { Avviso, Campo, Pulsante, Scheda, type EsitoModulo } from "@/components/ui";
import type { CampoParametro } from "@/lib/parametri-modulo";

type Props = {
  gruppi: { titolo: string; campi: CampoParametro[] }[];
  qualifiche: string[];
  titoli: string[];
  valori: Record<string, string>;
  oggi: string;
};

const piccolo = "mt-1 w-full rounded-lg border border-bordo bg-superficie px-3 py-2 text-testo aria-[invalid=true]:border-errore";

function Cella({ name, esito, etichetta }: { name: string; esito: EsitoModulo; etichetta: string }) {
  const errore = esito.errori?.[name];
  return (
    <td className="px-2 py-2 align-top">
      <input name={name} aria-label={etichetta} defaultValue={esito.valori?.[name]} aria-invalid={errore ? true : undefined} className={piccolo} />
      {errore && <p className="mt-1 text-xs text-errore">{errore}</p>}
    </td>
  );
}

export function ModuloParametri({ gruppi, qualifiche, titoli, valori, oggi }: Props) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(nuovaVersioneParametri, { valori: { ...valori, validoDal: oggi } });
  return (
    <form action={azione} className="grid gap-5" noValidate>
      {esito.messaggio && <Avviso tipo={esito.ok ? "ok" : "errore"}>{esito.messaggio}</Avviso>}

      <Scheda>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etichetta="In vigore dal" name="validoDal" type="date" min={oggi} esito={esito} required aiuto="Gli ordini e i mesi già calcolati restano con la versione di allora." />
          <Campo etichetta="Cosa cambia e perché" name="note" esito={esito} required />
        </div>
      </Scheda>

      {gruppi.map((g) => (
        <Scheda key={g.titolo}>
          <h2 className="mb-3 font-titoli text-xl text-oro-chiaro">{g.titolo}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.campi.map((c) =>
              c.tipo === "booleano" ? (
                <label key={c.chiave} className="block text-sm text-testo-tenue">
                  {c.etichetta}
                  <select name={c.chiave} defaultValue={esito.valori?.[c.chiave]} className={piccolo}>
                    <option value="si">Sì</option>
                    <option value="no">No</option>
                  </select>
                </label>
              ) : (
                <Campo key={c.chiave} etichetta={c.etichetta} name={c.chiave} type={c.tipo === "data" ? "date" : "text"} esito={esito} inputMode={c.tipo === "data" ? undefined : "decimal"} />
              ),
            )}
          </div>
        </Scheda>
      ))}

      <Scheda>
        <h2 className="mb-3 font-titoli text-xl text-oro-chiaro">Qualifiche</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-testo-tenue">
              <tr>
                <th className="px-2 font-medium">Qualifica</th>
                <th className="px-2 font-medium">Punti di gruppo</th>
                <th className="px-2 font-medium">Percentuale (%)</th>
              </tr>
            </thead>
            <tbody>
              {qualifiche.map((nome, i) => (
                <tr key={nome}>
                  <td className="px-2 py-2">{nome}</td>
                  <Cella name={`qualifiche.${i}.soglia`} esito={esito} etichetta={`${nome}: punti di gruppo`} />
                  <Cella name={`qualifiche.${i}.percentuale`} esito={esito} etichetta={`${nome}: percentuale`} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Scheda>

      <Scheda>
        <h2 className="mb-3 font-titoli text-xl text-oro-chiaro">Titoli manager</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-testo-tenue">
              <tr>
                <th className="px-2 font-medium">Titolo</th>
                <th className="px-2 font-medium">Linee forti</th>
                <th className="px-2 font-medium">Generazioni (%, separate da ;)</th>
                <th className="px-2 font-medium">Quote pool</th>
                <th className="px-2 font-medium">Bonus auto (€)</th>
              </tr>
            </thead>
            <tbody>
              {titoli.map((nome, i) => (
                <tr key={nome}>
                  <td className="px-2 py-2">{nome}</td>
                  <Cella name={`titoli.${i}.linee`} esito={esito} etichetta={`${nome}: linee forti`} />
                  <Cella name={`titoli.${i}.generazioni`} esito={esito} etichetta={`${nome}: generazioni`} />
                  <Cella name={`titoli.${i}.quotePool`} esito={esito} etichetta={`${nome}: quote pool`} />
                  <Cella name={`titoli.${i}.bonusAuto`} esito={esito} etichetta={`${nome}: bonus auto`} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Scheda>

      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? "Salvataggio…" : "Salva la nuova versione"}
      </Pulsante>
    </form>
  );
}
