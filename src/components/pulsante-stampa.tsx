"use client";

/** Apre la stampa del browser: da lì si stampa o si sceglie "Salva come PDF" (anche dal telefono). */
export function PulsanteStampa({ etichetta = "Stampa o salva in PDF" }: { etichetta?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="non-stampare rounded-lg bg-oro px-5 py-3 font-semibold text-nero">
      {etichetta}
    </button>
  );
}
