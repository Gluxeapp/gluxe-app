import { Collegamento, PaginaPubblica, Titolo } from "@/components/ui";
import { ModuloRegistrazione } from "./modulo-registrazione";

export const metadata = { title: "Registrazione · G LUXE" };

export default function Registrazione() {
  return (
    <PaginaPubblica>
      <Titolo sottotitolo="Compila i tuoi dati: riceverai subito il tuo codice incaricato.">Diventa incaricata</Titolo>
      <ModuloRegistrazione />
      <p className="mt-6 text-center text-sm text-testo-tenue">
        Sei già registrata? <Collegamento href="/">Accedi</Collegamento>
      </p>
    </PaginaPubblica>
  );
}
