import Image from "next/image";
import Link from "next/link";
import { Collegamento } from "@/components/ui";
import { SuggerimentoInstallazione } from "@/components/suggerimento-installazione";
import { ModuloAccesso } from "./modulo-accesso";

export default function Accesso() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <Image
          src="/brand/logo-g-luxe.png"
          alt="G LUXE · Nata per brillare"
          width={1779}
          height={899}
          priority
          className="mx-auto w-full max-w-xs"
        />

        <h1 className="mt-6 text-center font-titoli text-3xl font-semibold testo-oro">Area Incaricati</h1>

        <div className="mt-8">
          <ModuloAccesso />
        </div>

        <p className="mt-4 text-center text-sm">
          <Collegamento href="/recupero-password">Password dimenticata?</Collegamento>
        </p>

        <Link
          href="/registrazione"
          className="mt-8 block rounded-lg border border-oro/60 py-3 text-center text-oro-chiaro"
        >
          Diventa incaricata: registrati
        </Link>

        <div className="mt-8 rounded-xl border border-bordo bg-superficie p-4 text-center">
          <p className="font-titoli text-xl text-oro-chiaro">Sei un cliente?</p>
          <p className="mt-1 text-sm text-testo-tenue">Acquista i prodotti G LUXE e ritrova i tuoi ordini.</p>
          <Link href="/cliente/registrazione" className="mt-3 block rounded-lg border border-oro/60 py-3 text-oro-chiaro">
            Acquista o crea il tuo profilo
          </Link>
          <p className="mt-2 text-sm">
            <Link href="/cliente/accesso" className="text-testo-tenue underline">
              Hai già un profilo? Accedi
            </Link>
          </p>
        </div>

        <SuggerimentoInstallazione />

        <p className="mt-10 text-center text-xs text-testo-tenue">
          <Link href="/staff/accesso">Accesso amministrazione</Link>
        </p>
      </div>
    </main>
  );
}
