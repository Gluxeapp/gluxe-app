"use client";

import { useActionState } from "react";
import {
  annullaFileBonifici,
  approva,
  creaFileBonifici,
  rifiuta,
  salvaDatiAzienda,
  segnaBonificiPagati,
  segnaF24Versato,
} from "@/app/azioni/pagamenti";
import { Avviso, Campo, PulsanteSecondario, type EsitoModulo } from "@/components/ui";

function Messaggio({ esito }: { esito: EsitoModulo }) {
  return esito.messaggio ? <p className={`w-full text-sm ${esito.ok ? "text-oro-chiaro" : "text-errore"}`}>{esito.messaggio}</p> : null;
}

const piccolo = "rounded-lg border px-3 py-2 text-sm disabled:opacity-50";

export function DecisioneRichiesta({ id }: { id: string }) {
  const [esitoSi, azioneSi, inCorsoSi] = useActionState<EsitoModulo, FormData>(approva, {});
  const [esitoNo, azioneNo, inCorsoNo] = useActionState<EsitoModulo, FormData>(rifiuta, {});
  return (
    <div className="grid gap-2">
      <form action={azioneSi}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" disabled={inCorsoSi || inCorsoNo} className={`${piccolo} border-oro/60 text-oro-chiaro`}>
          Approva e crea il documento
        </button>
      </form>
      <form action={azioneNo} className="flex flex-wrap gap-2">
        <input type="hidden" name="id" value={id} />
        <input name="motivo" placeholder="Motivo del rifiuto" aria-label="Motivo del rifiuto" className="min-w-40 flex-1 rounded-lg border border-bordo bg-superficie px-3 py-2 text-sm" />
        <button type="submit" disabled={inCorsoSi || inCorsoNo} className={`${piccolo} border-errore/60 text-errore`}>
          Rifiuta
        </button>
      </form>
      <Messaggio esito={esitoSi.messaggio ? esitoSi : esitoNo} />
    </div>
  );
}

export function CreaFile({ dataPagamento }: { dataPagamento: string }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(creaFileBonifici, {});
  return (
    <form action={azione} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="dataPagamento" value={dataPagamento} />
      <button type="submit" disabled={inCorso} className={`${piccolo} border-oro/60 text-oro-chiaro`}>
        Crea il file bonifici
      </button>
      <Messaggio esito={esito} />
    </form>
  );
}

export function AzioniFile({ id, pagabile, annullabile }: { id: string; pagabile: boolean; annullabile: boolean }) {
  const [esitoP, azioneP, inCorsoP] = useActionState<EsitoModulo, FormData>(segnaBonificiPagati, {});
  const [esitoA, azioneA, inCorsoA] = useActionState<EsitoModulo, FormData>(annullaFileBonifici, {});
  return (
    <div className="flex flex-wrap items-center gap-2">
      {pagabile && (
        <form action={azioneP}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" disabled={inCorsoP || inCorsoA} className={`${piccolo} border-oro/60 text-oro-chiaro`}>
            Segna come pagati
          </button>
        </form>
      )}
      {annullabile && (
        <form action={azioneA}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" disabled={inCorsoP || inCorsoA} className={`${piccolo} border-errore/60 text-errore`}>
            Annulla il file
          </button>
        </form>
      )}
      <Messaggio esito={esitoP.messaggio ? esitoP : esitoA} />
    </div>
  );
}

export function VersamentoF24({ periodo, scadenza }: { periodo: string; scadenza: string }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(segnaF24Versato, {});
  return (
    <form action={azione} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="periodo" value={periodo} />
      <input
        type="date"
        name="versatoIl"
        defaultValue={scadenza}
        aria-label="Data del versamento"
        className="rounded-lg border border-bordo bg-superficie px-3 py-2 text-sm"
        required
      />
      <button type="submit" disabled={inCorso} className={`${piccolo} border-oro/60 text-oro-chiaro`}>
        Segna versato
      </button>
      <Messaggio esito={esito} />
    </form>
  );
}

export function ModuloAzienda({ valori }: { valori: Record<string, string> }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(salvaDatiAzienda, { valori });
  return (
    <form action={azione} className="grid gap-4 sm:grid-cols-2">
      {esito.messaggio && (
        <div className="sm:col-span-2">
          <Avviso tipo={esito.ok ? "ok" : "errore"}>{esito.messaggio}</Avviso>
        </div>
      )}
      <Campo etichetta="Ragione sociale" name="ragioneSociale" esito={esito} className="sm:col-span-2" />
      <Campo etichetta="Indirizzo della sede" name="indirizzo" esito={esito} className="sm:col-span-2" />
      <Campo etichetta="CAP" name="cap" esito={esito} inputMode="numeric" maxLength={5} />
      <Campo etichetta="Città" name="citta" esito={esito} />
      <Campo etichetta="Provincia" name="provincia" esito={esito} maxLength={2} />
      <Campo etichetta="Codice fiscale" name="codiceFiscale" esito={esito} />
      <Campo etichetta="Partita IVA" name="partitaIva" esito={esito} inputMode="numeric" maxLength={11} />
      <Campo etichetta="IBAN del conto da cui partono i bonifici" name="iban" esito={esito} className="sm:col-span-2" />
      <Campo etichetta="Codice CUC (te lo dà la banca, 8 caratteri)" name="cuc" esito={esito} maxLength={8} />
      <Campo
        etichetta="Autorizzazione al bollo virtuale"
        name="autorizzazioneBollo"
        esito={esito}
        placeholder="Autorizzazione Agenzia delle Entrate di … n. … del …"
        className="sm:col-span-2"
        aiuto="Compare sulle ricevute e fatture senza IVA con il bollo."
      />
      <PulsanteSecondario type="submit" disabled={inCorso} className="sm:col-span-2">
        Salva i dati dell&apos;azienda
      </PulsanteSecondario>
    </form>
  );
}
