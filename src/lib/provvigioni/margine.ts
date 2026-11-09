import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { margineRighe } from "../prezzi";

/**
 * Margine stimato degli acquisti personali di un'incaricata, mese per mese nell'anno indicato
 * (docs/piano-compensi.md, sezione 2: solo informativo, non entra nel saldo né nei pagamenti).
 * Contano gli ordini personali pagati e non annullati o resi, nel mese in cui Stripe ha confermato il pagamento.
 * Le righe fatte prima che si fotografasse il listino usano il listino attuale del prodotto.
 */
export async function margineDellAnno(incaricataId: string, anno: number) {
  const righe = await db().execute<{
    mese: string;
    tipo_prezzo: string;
    quantita: number;
    prezzo: string;
    listino: string;
  }>(sql`
    select to_char(o.pagato_il at time zone 'Europe/Rome', 'YYYY-MM') as mese,
      r.tipo_prezzo, r.quantita, r.prezzo_unitario_ivato::text as prezzo,
      coalesce(r.listino_unitario_ivato, p.prezzo_listino)::text as listino
    from app.ordini o
    join app.righe_ordine r on r.ordine_id = o.id
    join app.prodotti p on p.id = r.prodotto_id
    where o.incaricato_id = ${incaricataId}
      and o.tipo = 'personale'
      and o.pagato_il is not null
      and o.stato not in ('annullato', 'reso')
      and extract(year from o.pagato_il at time zone 'Europe/Rome') = ${anno}`);

  const perMese = new Map<string, bigint>();
  for (const r of righe.rows) {
    const m = margineRighe([
      { tipoPrezzo: r.tipo_prezzo, quantita: Number(r.quantita), prezzoUnitarioIvato: BigInt(r.prezzo), listinoUnitarioIvato: BigInt(r.listino) },
    ]);
    if (m > 0n) perMese.set(r.mese, (perMese.get(r.mese) ?? 0n) + m);
  }
  const mesi = [...perMese.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
  return { mesi, totale: mesi.reduce((t, [, x]) => t + x, 0n) };
}
