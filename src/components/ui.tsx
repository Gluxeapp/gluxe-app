import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** Risposta standard delle azioni dei moduli. */
export type EsitoModulo = {
  messaggio?: string;
  errori?: Record<string, string>;
  valori?: Record<string, string>;
  ok?: boolean;
};

const classeInput =
  "mt-1 w-full rounded-lg border border-bordo bg-superficie px-4 py-3 text-testo placeholder:text-testo-tenue/60 focus:border-oro focus:outline-none aria-[invalid=true]:border-errore";

type PropsCampo = ComponentProps<"input"> & {
  etichetta: string;
  name: string;
  esito?: EsitoModulo;
  aiuto?: ReactNode;
};

/** Campo di un modulo con etichetta, valore precedente ed eventuale errore. */
export function Campo({ etichetta, name, esito, aiuto, className, ...props }: PropsCampo) {
  const errore = esito?.errori?.[name];
  const idErrore = `${name}-errore`;
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm text-testo-tenue">
        {etichetta}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={props.type === "password" ? undefined : esito?.valori?.[name]}
        aria-invalid={errore ? true : undefined}
        aria-describedby={errore ? idErrore : undefined}
        className={classeInput}
        {...props}
      />
      {aiuto && !errore && <p className="mt-1 text-xs text-testo-tenue">{aiuto}</p>}
      {errore && (
        <p id={idErrore} className="mt-1 text-sm text-errore">
          {errore}
        </p>
      )}
    </div>
  );
}

export function Pulsante({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      className={`w-full rounded-lg bg-oro py-3 font-semibold tracking-wide text-nero transition-opacity disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

export function PulsanteSecondario({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      className={`rounded-lg border border-oro/60 px-4 py-2 text-sm text-oro-chiaro disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

export function Avviso({ tipo = "info", children }: { tipo?: "info" | "errore" | "ok"; children: ReactNode }) {
  const colori = {
    info: "border-bordo bg-superficie text-testo-tenue",
    errore: "border-errore/50 bg-errore/10 text-errore",
    ok: "border-oro/50 bg-oro/10 text-oro-chiaro",
  }[tipo];
  return (
    <div role={tipo === "errore" ? "alert" : "status"} className={`rounded-lg border p-4 text-sm ${colori}`}>
      {children}
    </div>
  );
}

export function Titolo({ children, sottotitolo }: { children: ReactNode; sottotitolo?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="font-titoli text-3xl font-semibold testo-oro">{children}</h1>
      {sottotitolo && <p className="mt-1 text-sm text-testo-tenue">{sottotitolo}</p>}
    </div>
  );
}

export function Scheda({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-bordo bg-superficie p-5 ${className}`}>{children}</div>;
}

export function Collegamento({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-oro-chiaro underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

export function Caricamento() {
  return <p className="py-10 text-center text-sm text-testo-tenue">Caricamento…</p>;
}

/** Pagina pubblica stretta e centrata (accesso, registrazione, recupero password). */
export function PaginaPubblica({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}

/** Trasforma gli errori di zod in { campo: messaggio }, tenendo il primo errore di ogni campo. */
export function erroriPerCampo(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const errori: Record<string, string> = {};
  for (const issue of issues) {
    const campo = String(issue.path[0] ?? "modulo");
    errori[campo] ??= issue.message;
  }
  return errori;
}

/** Valori di un FormData da rimandare al modulo (senza password). */
export function valoriDa(formData: FormData): Record<string, string> {
  const valori: Record<string, string> = {};
  for (const [chiave, valore] of formData) {
    if (typeof valore === "string" && !chiave.toLowerCase().includes("password") && !chiave.startsWith("$")) {
      valori[chiave] = valore;
    }
  }
  return valori;
}
