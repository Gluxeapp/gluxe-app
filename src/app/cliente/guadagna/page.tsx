import { Suspense } from "react";
import { Caricamento } from "@/components/ui";
import { richiediCliente } from "@/lib/accesso";
import { candidaturaAperta, datiGuadagna } from "@/lib/profilo-cliente";
import { LandingGuadagna } from "./landing";

export const metadata = { title: "Guadagna con G LUXE · Clienti G LUXE" };

/**
 * "Guadagna con G LUXE": landing page per le clienti con profilo, con le possibilità dell'attività di incaricata,
 * gli incentivi delle Leader (senza importi per pool e bonus auto, fondatore 23/11/2026) e la candidatura alla sede.
 * Nessuna promessa di guadagno: i numeri mostrati sono regole del piano lette da parametri e catalogo.
 */
export default function Guadagna() {
  return (
    <Suspense fallback={<Caricamento />}>
      <Contenuto />
    </Suspense>
  );
}

async function Contenuto() {
  const { cliente } = await richiediCliente();
  const [d, aperta] = await Promise.all([datiGuadagna(), candidaturaAperta(cliente.id)]);
  return <LandingGuadagna d={d} aperta={aperta} />;
}
