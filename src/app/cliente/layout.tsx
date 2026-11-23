import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { esci } from "@/app/azioni/accesso";
import { sessioneCorrente } from "@/lib/accesso";

/** Area dei clienti del negozio con il loro profilo (decisione 32). */
export default function LayoutCliente({ children }: LayoutProps<"/cliente">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-bordo bg-superficie">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/cliente">
            <Image src="/brand/logo-g-luxe.png" alt="G LUXE · Nata per brillare" width={1779} height={899} priority className="w-28" />
          </Link>
          <Suspense fallback={null}>
            <Menu />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-5">{children}</main>
      <footer className="border-t border-bordo px-5 py-6 text-center text-xs text-testo-tenue">
        G LUXE · Vendita diretta ·{" "}
        <a href="/privacy#clienti" className="underline">
          Privacy
        </a>
      </footer>
    </div>
  );
}

async function Menu() {
  const sessione = await sessioneCorrente();
  if (!sessione || sessione.ruolo !== "cliente") return null;
  return (
    <nav className="flex items-center gap-4 text-sm text-testo-tenue">
      <Link href="/cliente">Acquista</Link>
      <Link href="/cliente/ordini">Ordini</Link>
      <Link href="/cliente/profilo">Profilo</Link>
      <form action={esci}>
        <button type="submit">Esci</button>
      </form>
    </nav>
  );
}
