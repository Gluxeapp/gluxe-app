import "server-only";
import type { Esecutore } from "@/db";
import { registroModifiche } from "@/db/schema";

type Voce = {
  utenteId: string | null;
  azione: string;
  entita: string;
  entitaId?: string;
  prima?: unknown;
  dopo?: unknown;
};

/** Scrive una riga nel registro modifiche (CLAUDE.md, regola 11). Usare dentro la stessa transazione della modifica. */
export async function registra(esecutore: Esecutore, voce: Voce): Promise<void> {
  await esecutore.insert(registroModifiche).values({
    utenteId: voce.utenteId,
    azione: voce.azione,
    entita: voce.entita,
    entitaId: voce.entitaId,
    prima: voce.prima ?? null,
    dopo: voce.dopo ?? null,
  });
}
