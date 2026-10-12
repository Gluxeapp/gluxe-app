import { Suspense } from "react";
import { Avviso, Caricamento, Collegamento, PaginaPubblica, Titolo } from "@/components/ui";
import { tokenRecuperoValido } from "@/lib/codici-verifica";
import { ModuloNuovaPassword } from "./modulo-nuova-password";

export const metadata = { title: "Nuova password · G LUXE" };

export default function ReimpostaPassword({ searchParams }: PageProps<"/reimposta-password">) {
  return (
    <PaginaPubblica>
      <Titolo>Scegli la nuova password</Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto searchParams={searchParams} />
      </Suspense>
    </PaginaPubblica>
  );
}

async function Contenuto({ searchParams }: Pick<PageProps<"/reimposta-password">, "searchParams">) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !(await tokenRecuperoValido(token))) {
    return (
      <>
        <Avviso tipo="errore">Il link non è valido o è scaduto. I link valgono un&apos;ora e si usano una sola volta.</Avviso>
        <p className="mt-6 text-center text-sm">
          <Collegamento href="/recupero-password">Richiedi un nuovo link</Collegamento>
        </p>
      </>
    );
  }
  return <ModuloNuovaPassword token={token} />;
}
