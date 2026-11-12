import Link from "next/link";
import { Collegamento, Titolo } from "@/components/ui";
import { ModuloAccessoCliente } from "./modulo";

export const metadata = { title: "Accedi · Clienti G LUXE" };

export default async function AccessoCliente({ searchParams }: PageProps<"/cliente/accesso">) {
  const { negozio } = await searchParams;
  const codice = typeof negozio === "string" && /^GL\d{6}$/i.test(negozio) ? negozio.toUpperCase() : "";
  return (
    <div className="mx-auto max-w-sm">
      <Titolo sottotitolo="Accedi al tuo profilo per comprare, ritrovare i tuoi ordini e seguire le spedizioni.">Area clienti</Titolo>
      <ModuloAccessoCliente />
      <p className="mt-4 text-center text-sm">
        <Collegamento href="/recupero-password">Password dimenticata?</Collegamento>
      </p>
      <Link
        href={codice ? `/cliente/registrazione?negozio=${codice}` : "/cliente/registrazione"}
        className="mt-8 block rounded-lg border border-oro/60 py-3 text-center text-oro-chiaro"
      >
        Non hai un profilo? Registrati
      </Link>
    </div>
  );
}
