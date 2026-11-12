import { Suspense } from "react";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediCliente } from "@/lib/accesso";
import { consulenteDi } from "@/lib/profilo-cliente";
import { ModuloProfiloCliente } from "./modulo";

export const metadata = { title: "Profilo · Clienti G LUXE" };

export default function ProfiloCliente() {
  return (
    <>
      <Titolo>Il mio profilo</Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto />
      </Suspense>
    </>
  );
}

async function Contenuto() {
  const { cliente } = await richiediCliente();
  const consulente = await consulenteDi(cliente.incaricatoId);
  return (
    <div className="grid gap-4">
      <Scheda>
        <h2 className="font-titoli text-xl text-oro-chiaro">La tua consulente</h2>
        {consulente ? (
          <>
            <p className="mt-2 text-sm">{consulente.nome}</p>
            {consulente.contatti && (
              <p className="mt-1 text-sm">
                <a href={`tel:${consulente.contatti.telefono.replace(/\s/g, "")}`} className="text-oro-chiaro underline">
                  {consulente.contatti.telefono}
                </a>{" "}
                ·{" "}
                <a href={`mailto:${consulente.contatti.email}`} className="text-oro-chiaro underline">
                  {consulente.contatti.email}
                </a>
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-testo-tenue">Non hai ancora una consulente: la scegli con il codice al primo acquisto.</p>
        )}
      </Scheda>
      <Scheda>
        <h2 className="mb-3 font-titoli text-xl text-oro-chiaro">I tuoi dati</h2>
        <p className="mb-3 text-sm text-testo-tenue">Email: {cliente.email}</p>
        <ModuloProfiloCliente
          valori={{
            nome: cliente.nome,
            cognome: cliente.cognome,
            telefono: cliente.telefono,
            indirizzo: cliente.indirizzo ?? "",
            cap: cliente.cap ?? "",
            citta: cliente.citta ?? "",
            provincia: cliente.provincia ?? "",
            consensoContatti: cliente.consensoContattiIl ? "on" : "",
          }}
        />
      </Scheda>
    </div>
  );
}
