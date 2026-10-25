import Link from "next/link";
import { esci } from "@/app/azioni/accesso";

const voci = [
  { href: "/staff", etichetta: "Riepilogo" },
  { href: "/staff/incaricati", etichetta: "Incaricati" },
  { href: "/staff/catalogo", etichetta: "Catalogo" },
  { href: "/staff/catalogo/promozioni", etichetta: "Promozioni" },
  { href: "/staff/parametri", etichetta: "Parametri del piano" },
  { href: "/staff/richieste", etichetta: "Richieste sponsor" },
  { href: "/staff/registro", etichetta: "Registro modifiche" },
];

export default function LayoutStaff({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-bordo bg-superficie">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link href="/staff" className="font-titoli text-2xl font-semibold testo-oro">
            G LUXE <span className="text-base text-testo-tenue">· Staff</span>
          </Link>
          <form action={esci}>
            <button type="submit" className="text-sm text-testo-tenue">
              Esci
            </button>
          </form>
        </div>
        <nav aria-label="Area staff" className="mx-auto flex max-w-5xl gap-5 overflow-x-auto px-5 pb-3 text-sm">
          {voci.map((v) => (
            <Link key={v.href} href={v.href} className="whitespace-nowrap text-testo-tenue hover:text-oro-chiaro">
              {v.etichetta}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">{children}</main>
    </div>
  );
}
