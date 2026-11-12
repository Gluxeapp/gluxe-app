/**
 * Fotografia dei dati di un mese chiuso (Fase 6). Modulo puro.
 *
 * Alla chiusura si salvano tutti i dati in ingresso al motore (ordini, rete, impostazioni, parametri).
 * Dalla fotografia il motore ridà le stesse voci al centesimo, per sempre: serve a mostrare i mesi
 * passati e a calcolare gli storni dei resi a percentuali ferme (sezione 9).
 */
import { z } from "zod";
import { parametriDaJson, parametriInJson } from "../parametri";
import { calcolaStorno, type DatiMese, type Voce } from "./motore";

const intero = z.coerce.bigint();

const schemaFotografia = z.object({
  mese: z.string().regex(/^\d{4}-\d{2}$/),
  parametri: z.unknown(),
  incaricate: z.array(z.object({ id: z.string(), sponsorId: z.string().nullable(), sospesa: z.boolean().optional(), ferma: z.boolean().optional() })),
  ordini: z.array(
    z.object({
      id: z.string(),
      incaricataId: z.string(),
      tipo: z.enum(["start_kit", "personale", "online"]),
      punti: intero,
      puntiPromo: intero,
      imponibile: intero,
    }),
  ),
  bloccate: z.array(z.object({ incaricataId: z.string(), percentuale: intero })).optional(),
  fondatori: z.array(z.object({ incaricataId: z.string(), ingresso: z.string(), decadeDal: z.string().nullable() })).optional(),
  quoteSpeciali: z
    .array(z.object({ incaricataId: z.string(), tipo: z.enum(["master_president", "quota_riservata"]), percentuale: intero, soloSeAttiva: z.boolean() }))
    .optional(),
  esclusiPool: z.array(z.string()).optional(),
  esclusiBonusAuto: z.array(z.string()).optional(),
});

/** Per salvare nel database (JSON non conosce i bigint): i bigint diventano testo. */
export function fotografaMese(d: DatiMese): unknown {
  return JSON.parse(JSON.stringify({ ...d, parametri: parametriInJson(d.parametri) }, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
}

export function datiDaFotografia(json: unknown): DatiMese {
  const f = schemaFotografia.parse(json);
  return { ...f, parametri: parametriDaJson(f.parametri) };
}

/**
 * Storno dei soli ordini nuovi, sapendo quali ordini dello stesso mese erano già stati stornati:
 * storno(già resi + nuovi) − storno(già resi). Così la somma degli storni fatti in momenti diversi
 * è esattamente lo storno di tutti insieme, e se tutto viene reso il mese torna a zero al centesimo.
 */
export function stornoIncrementale(mese: DatiMese, giaStornati: string[], nuovi: string[]): Voce[] {
  const prima = giaStornati.length > 0 ? calcolaStorno(mese, giaStornati) : [];
  const dopo = calcolaStorno(mese, [...giaStornati, ...nuovi]);
  const chiave = (v: Voce) => `${v.beneficiariaId}\u0000${v.tipo}\u0000${v.origine ?? ""}`;
  const giaFatti = new Map(prima.map((v) => [chiave(v), v]));
  const esito: Voce[] = [];
  const chiavi = [...new Set([...dopo.map(chiave), ...prima.map(chiave)])].sort();
  const daDopo = new Map(dopo.map((v) => [chiave(v), v]));
  for (const k of chiavi) {
    const a = giaFatti.get(k);
    const b = daDopo.get(k);
    const importo = (b?.importo ?? 0n) - (a?.importo ?? 0n);
    if (importo === 0n) continue;
    const v = (b ?? a)!;
    esito.push({ ...v, base: (b?.base ?? 0n) - (a?.base ?? 0n), importo });
  }
  return esito;
}
