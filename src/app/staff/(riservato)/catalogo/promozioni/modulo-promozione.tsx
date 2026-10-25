"use client";

import { useActionState } from "react";
import { creaPromozione } from "@/app/azioni/catalogo";
import { Avviso, Campo, Pulsante, type EsitoModulo } from "@/components/ui";

export function ModuloPromozione({ prodotti }: { prodotti: { id: string; nome: string }[] }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(creaPromozione, {});
  return (
    <form action={azione} className="space-y-4" noValidate>
      {esito.messaggio && <Avviso tipo={esito.ok ? "ok" : "errore"}>{esito.messaggio}</Avviso>}
      <div>
        <label htmlFor="prodottoId" className="block text-sm text-testo-tenue">
          Prodotto
        </label>
        <select
          id="prodottoId"
          name="prodottoId"
          defaultValue={esito.valori?.prodottoId ?? ""}
          className="mt-1 w-full rounded-lg border border-bordo bg-superficie px-4 py-3 text-testo"
        >
          <option value="" disabled>
            Scegli…
          </option>
          {prodotti.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        {esito.errori?.prodottoId && <p className="mt-1 text-sm text-errore">{esito.errori.prodottoId}</p>}
      </div>
      <Campo etichetta="Titolo" name="titolo" esito={esito} placeholder="Promo autunno" required />
      <Campo etichetta="Prezzo al pubblico in promozione" name="prezzoPromo" esito={esito} inputMode="decimal" placeholder="27,90" required />
      <div className="grid grid-cols-2 gap-3">
        <Campo etichetta="Dal" name="dal" type="date" esito={esito} required />
        <Campo etichetta="Al" name="al" type="date" esito={esito} required />
      </div>
      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? "Salvataggio…" : "Crea promozione"}
      </Pulsante>
    </form>
  );
}
