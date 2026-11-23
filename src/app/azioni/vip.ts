"use server";

import { z } from "zod";
import { QUANTITA_MASSIMA } from "@/lib/calcolo-ordine";
import { verificaCliente } from "@/lib/accesso";
import { validaFinoDelCliente } from "@/lib/clienti-vip";
import { fraseVipDelCarrello } from "@/lib/negozio";
import { leggiSessione } from "@/lib/sessione";

/**
 * Frase del carrello sul Cliente VIP (decisione 35), ricalcolata sul server a ogni cambio di quantità:
 * il browser mostra solo il testo. Da ospite non si guarda lo status (nessuna informazione su altre persone);
 * dal profilo si usa lo status della cliente collegata.
 */
const schemaRichiesti = z
  .array(z.object({ prodottoId: z.uuid(), quantita: z.number().int().min(0).max(QUANTITA_MASSIMA) }))
  .max(50);

export type FraseVip = { testo: string; vip: boolean; raggiunto: boolean; barra: boolean; avanzamento: number };

export async function fraseVip(richiesti: unknown, daProfilo: boolean): Promise<FraseVip | null> {
  const letti = schemaRichiesti.safeParse(richiesti);
  if (!letti.success) return null;
  let validaFino: string | null = null;
  if (daProfilo) {
    const sessione = await leggiSessione();
    if (!sessione || sessione.ruolo !== "cliente") return null;
    const { cliente } = await verificaCliente(sessione);
    validaFino = await validaFinoDelCliente(cliente.id);
  }
  try {
    return await fraseVipDelCarrello(letti.data, validaFino);
  } catch {
    // Un prodotto appena tolto dal catalogo: la frase si aggiorna al prossimo cambio.
    return null;
  }
}
