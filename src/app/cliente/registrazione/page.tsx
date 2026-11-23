import { Suspense } from "react";
import { Caricamento, Collegamento, Titolo } from "@/components/ui";
import { negozioDi } from "@/lib/negozio";
import { ModuloRegistrazioneCliente } from "./modulo";

export const metadata = { title: "Crea il tuo profilo · Clienti G LUXE" };

export default function RegistrazioneCliente({ searchParams }: PageProps<"/cliente/registrazione">) {
  return (
    <div className="mx-auto max-w-md">
      <Titolo sottotitolo="Con il profilo ritrovi i tuoi ordini, l'indirizzo di spedizione e puoi ricomprare quando vuoi.">Crea il tuo profilo</Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto searchParams={searchParams} />
      </Suspense>
      <p className="mt-6 text-center text-sm">
        Hai già un profilo? <Collegamento href="/cliente/accesso">Accedi</Collegamento>
      </p>
    </div>
  );
}

async function Contenuto({ searchParams }: Pick<PageProps<"/cliente/registrazione">, "searchParams">) {
  const { negozio } = await searchParams;
  const codice = typeof negozio === "string" ? negozio.toUpperCase() : "";
  const consulente = codice ? await negozioDi(codice) : undefined;
  return (
    <>
      {consulente?.stato.aperto ? (
        <p className="mb-4 text-sm text-testo-tenue">
          La tua consulente sarà <strong className="text-oro-chiaro">{consulente.nome}</strong>.
        </p>
      ) : (
        <p className="mb-4 text-sm text-testo-tenue">
          Per il primo acquisto ti servirà il codice della tua consulente: se non ce l&apos;hai, dopo la registrazione potrai chiederlo
          all&apos;azienda.
        </p>
      )}
      <ModuloRegistrazioneCliente negozio={consulente?.stato.aperto ? consulente.codice : ""} />
    </>
  );
}
