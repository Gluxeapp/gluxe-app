import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avviso, Caricamento } from "@/components/ui";
import { formattaEuro } from "@/lib/denaro";
import { catalogoNegozio, negozioDi } from "@/lib/negozio";
import { pagamentiAttivi } from "@/lib/stripe";
import { ModuloNegozio } from "./modulo-negozio";

export async function generateMetadata({ params }: PageProps<"/negozio/[codice]">): Promise<Metadata> {
  const { codice } = await params;
  const negozio = await negozioDi(codice.toUpperCase());
  return {
    title: negozio ? `Il negozio di ${negozio.nome} · G LUXE` : "Negozio G LUXE",
    description: "Haircare G LUXE: acquista dalla tua consulente.",
  };
}

/** Negozio personale online di un'incaricata: pagina pubblica, il cliente compra senza registrarsi. */
export default function Negozio({ params }: PageProps<"/negozio/[codice]">) {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-bordo bg-superficie">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-5 py-6">
          <Image src="/brand/logo-g-luxe.png" alt="G LUXE · Nata per brillare" width={1779} height={899} priority className="w-44" />
        </div>
      </header>
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-5">
        <Suspense fallback={<Caricamento />}>
          <Contenuto params={params} />
        </Suspense>
      </div>
      <footer className="border-t border-bordo px-5 py-6 text-center text-xs text-testo-tenue">
        G LUXE · Vendita diretta ·{" "}
        <a href="/privacy#clienti" className="underline">
          Privacy
        </a>
      </footer>
    </main>
  );
}

async function Contenuto({ params }: Pick<PageProps<"/negozio/[codice]">, "params">) {
  const { codice } = await params;
  const negozio = await negozioDi(codice.toUpperCase());
  if (!negozio) notFound();

  const intestazione = (
    <div className="mb-8 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-testo-tenue">Il negozio di</p>
      <h1 className="mt-1 font-titoli text-4xl font-semibold testo-oro">{negozio.nome}</h1>
      <p className="mt-1 text-sm text-testo-tenue">Consulente G LUXE · {negozio.codice}</p>
      <p className="mt-2 text-xs text-testo-tenue">
        Hai un profilo? <a href={`/cliente/accesso?negozio=${negozio.codice}`} className="text-oro-chiaro underline">Accedi</a> · oppure{" "}
        <a href={`/cliente/registrazione?negozio=${negozio.codice}`} className="text-oro-chiaro underline">crea il tuo profilo</a> per ritrovare ordini e indirizzo
      </p>
    </div>
  );

  if (!negozio.stato.aperto) {
    return (
      <>
        {intestazione}
        <Avviso>Questo negozio al momento non è disponibile. Per acquistare contatta l&apos;azienda.</Avviso>
      </>
    );
  }

  const catalogo = await catalogoNegozio();
  // Testi già pronti dal server: il browser non calcola nulla.
  const prodotti = catalogo.prodotti.map((p) => ({
    id: p.id,
    nome: p.nome,
    dettaglio: [p.linea, p.formato].filter(Boolean).join(" · "),
    descrizione: p.descrizione,
    immagineId: p.immagineId,
    prezzo: formattaEuro(p.prezzo),
    barrato: p.promozione && p.listino > p.prezzo ? formattaEuro(p.listino) : undefined,
    promozione: p.promozione ?? undefined,
  }));

  return (
    <>
      {intestazione}
      {pagamentiAttivi() ? (
        <ModuloNegozio codice={negozio.codice} prodotti={prodotti} spedizione={formattaEuro(catalogo.speseSpedizione)} />
      ) : (
        <Avviso>Il pagamento online sarà attivo a breve. Torna a trovarci presto!</Avviso>
      )}
    </>
  );
}
