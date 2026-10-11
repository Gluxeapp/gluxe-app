import Link from "next/link";
import { SezioniAnteprima } from "./sezioni";

export default function Anteprima() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-bordo bg-nero/95 px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <span className="font-titoli text-2xl font-semibold testo-oro">G LUXE</span>
        <Link href="/" className="text-sm text-testo-tenue">
          Esci
        </Link>
      </header>
      <SezioniAnteprima />
    </div>
  );
}
