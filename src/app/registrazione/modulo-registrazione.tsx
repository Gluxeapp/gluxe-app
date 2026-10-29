"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { registraIncaricato, verificaCodiceSponsor } from "@/app/azioni/registrazione";
import { CampiAnagrafica, Sezione } from "@/components/campi-anagrafica";
import { Avviso, Campo, Pulsante, PulsanteSecondario, type EsitoModulo } from "@/components/ui";

export function ModuloRegistrazione() {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(registraIncaricato, {});
  const [sponsor, setSponsor] = useState<{ etichetta?: string; errore?: string }>({});
  const [verificaInCorso, avviaVerifica] = useTransition();

  function controllaSponsor(codice: string) {
    if (!codice.trim()) return setSponsor({});
    avviaVerifica(async () => setSponsor(await verificaCodiceSponsor(codice)));
  }

  return (
    <form action={azione} className="space-y-6" noValidate>
      {esito.messaggio && <Avviso tipo="errore">{esito.messaggio}</Avviso>}

      <Sezione titolo="Il tuo sponsor">
        <div className="flex items-end gap-3">
          <Campo
            etichetta="Codice sponsor"
            name="codiceSponsor"
            esito={esito}
            placeholder="GL000123"
            autoCapitalize="characters"
            className="flex-1"
            onBlur={(e) => controllaSponsor(e.currentTarget.value)}
            required
          />
          <PulsanteSecondario
            type="button"
            className="mb-[2px] py-3"
            disabled={verificaInCorso}
            onClick={(e) => {
              const campo = e.currentTarget.form?.elements.namedItem("codiceSponsor") as HTMLInputElement | null;
              controllaSponsor(campo?.value ?? "");
            }}
          >
            Verifica
          </PulsanteSecondario>
        </div>
        {sponsor.etichetta && <Avviso tipo="ok">Il tuo sponsor è {sponsor.etichetta}</Avviso>}
        {sponsor.errore && <Avviso tipo="errore">{sponsor.errore}</Avviso>}
        <Avviso>
          Se non hai un codice sponsor chiedilo all&apos;azienda:{" "}
          <Link href="/richiesta-sponsor" className="text-oro-chiaro underline">
            invia una richiesta
          </Link>{" "}
          e ti contatteremo noi.
        </Avviso>
      </Sezione>

      <CampiAnagrafica esito={esito} />

      <Sezione titolo="Password">
        <Campo
          etichetta="Scegli una password"
          name="password"
          type="password"
          esito={esito}
          autoComplete="new-password"
          aiuto="Almeno 10 caratteri, con lettere e numeri."
          required
        />
        <Campo
          etichetta="Ripeti la password"
          name="confermaPassword"
          type="password"
          esito={esito}
          autoComplete="new-password"
          required
        />
      </Sezione>

      <Avviso>
        Per completare la registrazione è previsto l&apos;acquisto dello <strong>start kit (59,90 €)</strong>. Dopo aver
        inviato i dati lo paghi online (carta, PayPal o Klarna): con il pagamento il tuo account si attiva.
      </Avviso>

      <div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="privacy" className="mt-1 accent-oro" defaultChecked={esito.valori?.privacy === "on"} />
          <span>
            Ho letto l&apos;
            <Link href="/privacy" target="_blank" className="text-oro-chiaro underline">
              informativa privacy
            </Link>{" "}
            e acconsento al trattamento dei miei dati per la gestione del rapporto di incaricata.
          </span>
        </label>
        {esito.errori?.privacy && <p className="mt-1 text-sm text-errore">{esito.errori.privacy}</p>}
      </div>

      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? "Registrazione in corso…" : "Completa la registrazione"}
      </Pulsante>
    </form>
  );
}
