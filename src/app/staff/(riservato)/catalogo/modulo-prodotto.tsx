"use client";

import { useActionState } from "react";
import { salvaProdotto } from "@/app/azioni/catalogo";
import { Sezione } from "@/components/campi-anagrafica";
import { Avviso, Campo, Pulsante, type EsitoModulo } from "@/components/ui";

export function ModuloProdotto({ id, valori, startKit }: { id?: string; valori?: Record<string, string>; startKit?: boolean }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(salvaProdotto, { valori });
  return (
    <form action={azione} className="space-y-6" noValidate>
      {esito.messaggio && <Avviso tipo={esito.ok ? "ok" : "errore"}>{esito.messaggio}</Avviso>}
      {id && <input type="hidden" name="id" value={id} />}
      <Sezione titolo="Prodotto">
        <div className="grid grid-cols-[1fr_2fr] gap-4">
          <Campo etichetta="Codice" name="codice" esito={esito} placeholder="HB-SH" autoCapitalize="characters" required />
          <Campo etichetta="Nome" name="nome" esito={esito} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Campo etichetta="Linea" name="linea" esito={esito} placeholder="Hair Botox" />
          <Campo etichetta="Formato" name="formato" esito={esito} placeholder="250 ml" />
        </div>
        <div>
          <label htmlFor="descrizione" className="block text-sm text-testo-tenue">
            Descrizione
          </label>
          <textarea
            id="descrizione"
            name="descrizione"
            rows={3}
            defaultValue={esito.valori?.descrizione}
            className="mt-1 w-full rounded-lg border border-bordo bg-superficie px-4 py-3 text-testo focus:border-oro focus:outline-none"
          />
        </div>
      </Sezione>
      <Sezione titolo="Prezzo e foto">
        <div className="grid grid-cols-2 gap-4">
          <Campo
            etichetta="Prezzo al pubblico (IVA inclusa)"
            name="prezzoListino"
            esito={esito}
            inputMode="decimal"
            placeholder="32,90"
            aiuto={startKit ? "Lo start kit vale sempre i punti fissi dei parametri." : "Prezzo incaricata e punti li calcola l'app."}
            required
          />
          <Campo etichetta="Ordine nell'elenco" name="ordine" esito={esito} inputMode="numeric" placeholder="10" />
        </div>
        <Campo
          etichetta="Foto (PNG, JPG o WEBP, massimo 900 KB)"
          name="foto"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          esito={esito}
          aiuto={id ? "Lascia vuoto per tenere la foto attuale." : undefined}
        />
      </Sezione>
      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? "Salvataggio…" : "Salva prodotto"}
      </Pulsante>
    </form>
  );
}
