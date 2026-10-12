import { Suspense } from "react";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { dataItaliana, ibanNascosto, mioProfilo } from "@/lib/dati-incaricato";

export default function Profilo() {
  return (
    <>
      <Titolo sottotitolo="Per modificare i tuoi dati contatta l'azienda.">Il mio profilo</Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto />
      </Suspense>
    </>
  );
}

async function Contenuto() {
  const p = await mioProfilo();
  const righe: [string, string][] = [
    ["Codice incaricato", p.codice],
    ["Sponsor", p.sponsor],
    ["Nome", `${p.nome} ${p.cognome}`],
    ["Codice fiscale", p.codiceFiscale],
    ["Data di nascita", dataItaliana(p.dataNascita)],
    ["Indirizzo", `${p.indirizzo}, ${p.cap} ${p.citta} (${p.provincia})`],
    ["Telefono", p.telefono],
    ["Email", p.email],
    ["IBAN", ibanNascosto(p.iban)],
    ["Partita IVA", p.partitaIva ?? "No"],
    ["Incaricata dal", dataItaliana(p.creatoIl)],
  ];
  return (
    <Scheda>
      <dl className="divide-y divide-bordo">
        {righe.map(([etichetta, valore]) => (
          <div key={etichetta} className="flex justify-between gap-4 py-3 text-sm">
            <dt className="text-testo-tenue">{etichetta}</dt>
            <dd className="text-right text-testo">{valore}</dd>
          </div>
        ))}
      </dl>
    </Scheda>
  );
}
