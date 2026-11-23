import { and, eq } from "drizzle-orm";
import { Suspense } from "react";
import { Caricamento, Collegamento, PaginaPubblica, Titolo } from "@/components/ui";
import { db } from "@/db";
import { prodotti } from "@/db/schema";
import { formattaEuro } from "@/lib/denaro";
import { ModuloRegistrazione } from "./modulo-registrazione";

export const metadata = { title: "Registrazione · G LUXE" };

export default function Registrazione() {
  return (
    <PaginaPubblica>
      <Titolo sottotitolo="Compila i tuoi dati: riceverai subito il tuo codice incaricato.">Diventa incaricata</Titolo>
      <Suspense fallback={<Caricamento />}>
        <Modulo />
      </Suspense>
      <p className="mt-6 text-center text-sm text-testo-tenue">
        Sei già registrata? <Collegamento href="/">Accedi</Collegamento>
      </p>
    </PaginaPubblica>
  );
}

// Il prezzo dello start kit si legge dal catalogo: se la sede lo cambia, il modulo si aggiorna da solo.
async function Modulo() {
  const [kit] = await db
    .select({ prezzo: prodotti.prezzoListino })
    .from(prodotti)
    .where(and(eq(prodotti.tipo, "start_kit"), eq(prodotti.attivo, true)))
    .limit(1);
  return <ModuloRegistrazione prezzoKit={kit ? formattaEuro(kit.prezzo) : undefined} />;
}
