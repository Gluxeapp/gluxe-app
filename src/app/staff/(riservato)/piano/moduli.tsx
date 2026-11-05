"use client";

import { useActionState } from "react";
import {
  aggiungiFondatore,
  aggiungiQualificaBloccata,
  aggiungiQuotaSpeciale,
  impostaEsclusioni,
  revocaQualificaBloccata,
  terminaQuotaSpeciale,
} from "@/app/azioni/piano";
import { Avviso, Campo, PulsanteSecondario, type EsitoModulo } from "@/components/ui";

const classeSelect = "mt-1 w-full rounded-lg border border-bordo bg-superficie px-4 py-3 text-testo";

function Esito({ esito }: { esito: EsitoModulo }) {
  return esito.messaggio ? <Avviso tipo={esito.ok ? "ok" : "errore"}>{esito.messaggio}</Avviso> : null;
}

function Scelta({ etichetta, name, opzioni, valore }: { etichetta: string; name: string; opzioni: [string, string][]; valore?: string }) {
  return (
    <label className="block text-sm text-testo-tenue">
      {etichetta}
      <select name={name} defaultValue={valore} className={classeSelect}>
        {opzioni.map(([v, e]) => (
          <option key={v} value={v}>
            {e}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ModuloBloccata({ percentuali }: { percentuali: [string, string][] }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(aggiungiQualificaBloccata, {});
  return (
    <form action={azione} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Esito esito={esito} />
      </div>
      <Campo etichetta="Codice incaricata" name="codice" esito={esito} placeholder="GL000123" required />
      <Scelta etichetta="Percentuale bloccata" name="percentuale" opzioni={percentuali} valore={esito.valori?.percentuale} />
      <Campo etichetta="Dal" name="dal" type="date" esito={esito} required />
      <Campo etichetta="Al (vuoto = senza scadenza)" name="al" type="date" esito={esito} />
      <Campo etichetta="Motivo" name="motivo" esito={esito} className="sm:col-span-2" required />
      <PulsanteSecondario type="submit" disabled={inCorso} className="sm:col-span-2">
        Blocca la qualifica
      </PulsanteSecondario>
    </form>
  );
}

export function RevocaBloccata({ id }: { id: string }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(revocaQualificaBloccata, {});
  return (
    <form action={azione} className="mt-2 flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <input name="motivo" placeholder="Motivo della revoca" aria-label="Motivo della revoca" className="flex-1 rounded-lg border border-bordo bg-superficie px-3 py-2 text-sm" required />
      <button type="submit" disabled={inCorso} className="rounded-lg border border-errore/60 px-3 py-2 text-sm text-errore">
        Revoca
      </button>
      {(esito.messaggio || esito.errori?.motivo) && (
        <p className={`w-full text-sm ${esito.ok ? "text-oro-chiaro" : "text-errore"}`}>{esito.errori?.motivo ?? esito.messaggio}</p>
      )}
    </form>
  );
}

export function ModuloFondatore() {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(aggiungiFondatore, {});
  return (
    <form action={azione} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Esito esito={esito} />
      </div>
      <Campo etichetta="Codice incaricata" name="codice" esito={esito} placeholder="GL000123" required />
      <Campo etichetta="Data di ingresso nel programma" name="ingresso" type="date" esito={esito} required />
      <PulsanteSecondario type="submit" disabled={inCorso} className="sm:col-span-2">
        Aggiungi Leader Fondatore
      </PulsanteSecondario>
    </form>
  );
}

export function ModuloQuota() {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(aggiungiQuotaSpeciale, {});
  return (
    <form action={azione} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Esito esito={esito} />
      </div>
      <Campo etichetta="Codice incaricata" name="codice" esito={esito} placeholder="GL000123" required />
      <Scelta
        etichetta="Tipo"
        name="tipo"
        valore={esito.valori?.tipo}
        opzioni={[
          ["quota_riservata", "Quota riservata (sezione 5e-bis)"],
          ["master_president", "Master President (sezione 5f)"],
        ]}
      />
      <Campo etichetta="Percentuale dell'incasso (%)" name="percentuale" esito={esito} placeholder="1" inputMode="decimal" required />
      <Scelta
        etichetta="Condizione"
        name="soloSeAttiva"
        valore={esito.valori?.soloSeAttiva}
        opzioni={[
          ["si", "Solo nei mesi in cui è attiva"],
          ["no", "Anche se inattiva"],
        ]}
      />
      <Campo etichetta="Dal" name="dal" type="date" esito={esito} required />
      <Campo etichetta="Al (vuoto = senza scadenza)" name="al" type="date" esito={esito} />
      <PulsanteSecondario type="submit" disabled={inCorso} className="sm:col-span-2">
        Aggiungi quota
      </PulsanteSecondario>
    </form>
  );
}

export function TerminaQuota({ id }: { id: string }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(terminaQuotaSpeciale, {});
  return (
    <form action={azione} className="mt-2 flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="text-sm text-testo-tenue">
        Ultimo giorno
        <input type="date" name="al" className="ml-2 rounded-lg border border-bordo bg-superficie px-3 py-2 text-sm" required />
      </label>
      <button type="submit" disabled={inCorso} className="rounded-lg border border-oro/60 px-3 py-2 text-sm text-oro-chiaro">
        Fai finire
      </button>
      {(esito.messaggio || esito.errori?.al) && (
        <p className={`w-full text-sm ${esito.ok ? "text-oro-chiaro" : "text-errore"}`}>{esito.errori?.al ?? esito.messaggio}</p>
      )}
    </form>
  );
}

export function ModuloEsclusioni() {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(impostaEsclusioni, {});
  const siNo: [string, string][] = [
    ["no", "No"],
    ["si", "Sì"],
  ];
  return (
    <form action={azione} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Esito esito={esito} />
      </div>
      <Campo etichetta="Codice incaricata" name="codice" esito={esito} placeholder="GL000123" required />
      <Campo etichetta="Motivo" name="motivo" esito={esito} required />
      <Scelta etichetta="Esclusa dal pool" name="esclusaPool" opzioni={siNo} valore={esito.valori?.esclusaPool} />
      <Scelta etichetta="Esclusa dal bonus auto" name="esclusaBonusAuto" opzioni={siNo} valore={esito.valori?.esclusaBonusAuto} />
      <PulsanteSecondario type="submit" disabled={inCorso} className="sm:col-span-2">
        Salva esclusioni
      </PulsanteSecondario>
    </form>
  );
}
