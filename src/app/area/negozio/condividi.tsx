"use client";

import { useState } from "react";
import { PulsanteSecondario } from "@/components/ui";

/** Link del negozio con i pulsanti "Copia" e, sul telefono, "Condividi". */
export function CondividiLink({ link }: { link: string }) {
  const [copiato, setCopiato] = useState(false);
  const puoCondividere = typeof navigator !== "undefined" && "share" in navigator;

  async function copia() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2500);
    } catch {
      setCopiato(false);
    }
  }

  return (
    <div className="mt-2">
      <p className="break-all rounded-lg border border-bordo bg-nero px-3 py-2 text-sm select-all">{link}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <PulsanteSecondario type="button" onClick={copia}>
          {copiato ? "Copiato!" : "Copia il link"}
        </PulsanteSecondario>
        {puoCondividere && (
          <PulsanteSecondario
            type="button"
            onClick={() => navigator.share({ title: "Il mio negozio G LUXE", url: link }).catch(() => undefined)}
          >
            Condividi
          </PulsanteSecondario>
        )}
        <a href={link} target="_blank" rel="noreferrer" className="rounded-lg px-4 py-2 text-sm text-testo-tenue underline">
          Apri il negozio
        </a>
      </div>
    </div>
  );
}
