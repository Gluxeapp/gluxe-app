import { Campo, type EsitoModulo } from "@/components/ui";
import type { Spedizione } from "@/lib/ordini";

/** Campi dell'indirizzo di spedizione, già compilati con quello del profilo. */
export function CampiSpedizione({ esito, iniziale }: { esito: EsitoModulo; iniziale: Spedizione }) {
  const valore = (campo: keyof Spedizione) => esito.valori?.[campo] ?? iniziale[campo];
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 font-titoli text-xl text-oro-chiaro">Spedizione</legend>
      <Campo etichetta="Destinatario" name="destinatario" esito={esito} defaultValue={valore("destinatario")} autoComplete="name" />
      <Campo etichetta="Indirizzo" name="indirizzo" esito={esito} defaultValue={valore("indirizzo")} autoComplete="street-address" />
      <div className="grid grid-cols-[1fr_2fr_1fr] gap-3">
        <Campo etichetta="CAP" name="cap" esito={esito} defaultValue={valore("cap")} inputMode="numeric" autoComplete="postal-code" />
        <Campo etichetta="Città" name="citta" esito={esito} defaultValue={valore("citta")} autoComplete="address-level2" />
        <Campo etichetta="Prov." name="provincia" esito={esito} defaultValue={valore("provincia")} maxLength={2} />
      </div>
      <Campo etichetta="Telefono per il corriere" name="telefono" esito={esito} defaultValue={valore("telefono")} type="tel" autoComplete="tel" />
    </fieldset>
  );
}
