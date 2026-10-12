"use client";

import Link from "next/link";
import { useActionState } from "react";
import { reimpostaPassword } from "@/app/azioni/password";
import { Avviso, Campo, Pulsante, type EsitoModulo } from "@/components/ui";

export function ModuloNuovaPassword({ token }: { token: string }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(reimpostaPassword, {});

  if (esito.ok) {
    return (
      <>
        <Avviso tipo="ok">{esito.messaggio}</Avviso>
        <Link
          href={esito.valori?.destinazione ?? "/"}
          className="mt-6 block rounded-lg bg-oro py-3 text-center font-semibold text-nero"
        >
          Vai all&apos;accesso
        </Link>
      </>
    );
  }

  return (
    <form action={azione} className="space-y-5">
      {esito.messaggio && <Avviso tipo="errore">{esito.messaggio}</Avviso>}
      <input type="hidden" name="token" value={token} />
      <Campo
        etichetta="Nuova password"
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
      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? "Salvataggio…" : "Salva la password"}
      </Pulsante>
    </form>
  );
}
