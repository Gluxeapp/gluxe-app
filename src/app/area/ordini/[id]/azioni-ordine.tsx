"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { annullaOrdine, pagaOrdine } from "@/app/azioni/ordini";
import { Avviso, Pulsante, PulsanteSecondario, type EsitoModulo } from "@/components/ui";

export function AzioniOrdine({ id, scaduto }: { id: string; scaduto: boolean }) {
  const [esitoPaga, paga, pagando] = useActionState<EsitoModulo, FormData>(pagaOrdine, {});
  const [esitoAnnulla, annulla, annullando] = useActionState<EsitoModulo, FormData>(annullaOrdine, {});
  const messaggio = esitoPaga.messaggio ?? esitoAnnulla.messaggio;
  return (
    <div className="space-y-3">
      {messaggio && <Avviso tipo={esitoAnnulla.ok ? "ok" : "errore"}>{messaggio}</Avviso>}
      <form action={paga}>
        <input type="hidden" name="id" value={id} />
        <Pulsante type="submit" disabled={pagando || annullando}>
          {pagando ? "Apertura del pagamento…" : scaduto ? "Verifica l'ordine" : "Paga ora"}
        </Pulsante>
      </form>
      <form action={annulla} className="text-center">
        <input type="hidden" name="id" value={id} />
        <PulsanteSecondario type="submit" disabled={pagando || annullando}>
          {annullando ? "Annullamento…" : "Annulla ordine"}
        </PulsanteSecondario>
      </form>
    </div>
  );
}

const MASSIMO_TENTATIVI = 20;

/** Dopo il pagamento su Stripe la conferma arriva in pochi secondi: la pagina si aggiorna da sola. */
export function AttesaConferma() {
  const router = useRouter();
  const [tentativi, setTentativi] = useState(0);
  useEffect(() => {
    if (tentativi >= MASSIMO_TENTATIVI) return;
    const attesa = setTimeout(() => {
      router.refresh();
      setTentativi((n) => n + 1);
    }, 3000);
    return () => clearTimeout(attesa);
  }, [tentativi, router]);
  return (
    <Avviso>
      {tentativi < MASSIMO_TENTATIVI
        ? "Pagamento in conferma: questa pagina si aggiorna da sola tra qualche secondo."
        : "La conferma sta richiedendo più tempo del solito. Riapri l'ordine più tardi: riceverai anche un'email."}
    </Avviso>
  );
}
