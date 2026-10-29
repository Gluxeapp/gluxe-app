import Link from "next/link";
import { esci } from "@/app/azioni/accesso";
import { Suspense } from "react";
import { NavigazioneArea, NavigazioneCorrente } from "./navigazione";

export default function LayoutArea({ children }: LayoutProps<"/area">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-bordo bg-nero/95 px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <Link href="/area" className="font-titoli text-2xl font-semibold testo-oro">
          G LUXE
        </Link>
        <div className="flex items-center gap-4 text-sm text-testo-tenue">
          <Link href="/area/profilo">Profilo</Link>
          <form action={esci}>
            <button type="submit">Esci</button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-5 py-6 pb-28">{children}</main>
      <Suspense fallback={<NavigazioneArea percorso="" />}>
        <NavigazioneCorrente />
      </Suspense>
    </div>
  );
}
