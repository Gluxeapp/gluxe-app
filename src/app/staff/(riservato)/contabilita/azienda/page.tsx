import Link from "next/link";
import { Suspense } from "react";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { leggiDatiAzienda } from "@/lib/provvigioni/conti";
import { ModuloAzienda } from "../moduli";

export default function DatiAzienda() {
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/staff/contabilita" className="text-testo-tenue">
          ← Contabilità
        </Link>
      </p>
      <Titolo sottotitolo="Compaiono su ricevute, fatture e F24 e servono per il file dei bonifici. Ogni modifica va nel registro modifiche; i documenti già fatti non cambiano.">
        Dati dell&apos;azienda
      </Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto />
      </Suspense>
    </>
  );
}

async function Contenuto() {
  await richiediStaff(["amministrazione", "contabilita"]);
  const { azienda } = await leggiDatiAzienda();
  const valori = Object.fromEntries(
    ["ragioneSociale", "indirizzo", "cap", "citta", "provincia", "codiceFiscale", "partitaIva", "iban", "cuc", "autorizzazioneBollo"].map((k) => [
      k,
      String(azienda?.[k as keyof typeof azienda] ?? ""),
    ]),
  );
  return (
    <Scheda>
      <ModuloAzienda valori={valori} />
    </Scheda>
  );
}
