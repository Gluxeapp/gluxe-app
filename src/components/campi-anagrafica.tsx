"use client";

import { useState, type ReactNode } from "react";
import { Campo, type EsitoModulo } from "./ui";

export function Sezione({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-bordo p-5">
      <legend className="px-2 font-titoli text-xl text-oro-chiaro">{titolo}</legend>
      {children}
    </fieldset>
  );
}

/** Dati anagrafici dell'incaricato: usati in registrazione e nell'area amministrazione. */
export function CampiAnagrafica({ esito }: { esito: EsitoModulo }) {
  const [haPartitaIva, setHaPartitaIva] = useState(esito.valori?.haPartitaIva === "si");

  return (
    <>
      <Sezione titolo="Dati personali">
        <div className="grid grid-cols-2 gap-4">
          <Campo etichetta="Nome" name="nome" esito={esito} autoComplete="given-name" required />
          <Campo etichetta="Cognome" name="cognome" esito={esito} autoComplete="family-name" required />
        </div>
        <Campo etichetta="Codice fiscale" name="codiceFiscale" esito={esito} autoCapitalize="characters" maxLength={16} required />
        <Campo etichetta="Data di nascita" name="dataNascita" type="date" esito={esito} autoComplete="bday" required />
      </Sezione>

      <Sezione titolo="Residenza">
        <Campo etichetta="Indirizzo" name="indirizzo" esito={esito} autoComplete="street-address" placeholder="Via Roma 1" required />
        <div className="grid grid-cols-[1fr_2fr_1fr] gap-3">
          <Campo etichetta="CAP" name="cap" esito={esito} inputMode="numeric" maxLength={5} autoComplete="postal-code" required />
          <Campo etichetta="Città" name="citta" esito={esito} autoComplete="address-level2" required />
          <Campo etichetta="Prov." name="provincia" esito={esito} maxLength={2} autoCapitalize="characters" required />
        </div>
      </Sezione>

      <Sezione titolo="Contatti e pagamenti">
        <Campo etichetta="Telefono" name="telefono" type="tel" esito={esito} autoComplete="tel" required />
        <Campo etichetta="Email" name="email" type="email" esito={esito} autoComplete="email" required />
        <Campo
          etichetta="IBAN per ricevere le provvigioni"
          name="iban"
          esito={esito}
          autoCapitalize="characters"
          placeholder="IT60 X054 2811 1010 0000 0123 456"
          required
        />
        <div>
          <p className="text-sm text-testo-tenue">Partita IVA</p>
          <div className="mt-2 flex gap-6">
            {[
              ["no", "No"],
              ["si", "Sì"],
            ].map(([valore, etichetta]) => (
              <label key={valore} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="haPartitaIva"
                  value={valore}
                  defaultChecked={(esito.valori?.haPartitaIva ?? "no") === valore}
                  onChange={() => setHaPartitaIva(valore === "si")}
                  className="accent-oro"
                />
                {etichetta}
              </label>
            ))}
          </div>
        </div>
        {haPartitaIva && <Campo etichetta="Numero di partita IVA" name="partitaIva" esito={esito} inputMode="numeric" maxLength={11} />}
      </Sezione>
    </>
  );
}
