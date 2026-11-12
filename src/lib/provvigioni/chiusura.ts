import "server-only";
import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { mesiChiusi, movimenti, ordini, ordiniChiusi, ordiniStornati, rettifiche } from "@/db/schema";
import { applicaDecadenze } from "../licenze";
import { registra } from "../registro";
import { datiDaFotografia, fotografaMese, stornoIncrementale } from "./congelamento";
import { datiDelMese, meseCorrente, meseDopo, ultimoMeseChiuso } from "./dati";
import { calcolaMese, type Voce } from "./motore";

/**
 * Chiusura del mese (docs/piano-compensi.md, sezione 7 punto 12; docs/garanzie-calcolo.md, sezione 3).
 * I mesi si chiudono in ordine, uno alla volta, solo dopo la loro fine e solo con la conferma della sede.
 */

export class ErroreChiusura extends Error {}

/** Primo mese con un ordine pagato (da lì parte la prima chiusura). */
async function primoMeseConOrdini(): Promise<string | null> {
  const {
    rows: [r],
  } = await db().execute<{ mese: string | null }>(
    // Come nel calcolo del mese: contano solo gli ordini pagati e non annullati né resi, rinnovi della licenza esclusi.
    sql`select to_char(min(pagato_il) at time zone 'Europe/Rome', 'YYYY-MM') as mese from app.ordini
        where pagato_il is not null and stato not in ('annullato', 'reso') and tipo::text <> 'licenza'`,
  );
  return r?.mese ?? null;
}

/** Il prossimo mese da chiudere, se è già finito; altrimenti nessuno. */
export async function meseDaChiudere(): Promise<string | null> {
  const [ultimo, corrente] = await Promise.all([ultimoMeseChiuso(), meseCorrente()]);
  const candidato = ultimo ? meseDopo(ultimo) : await primoMeseConOrdini();
  return candidato && candidato < corrente ? candidato : null;
}

/** Ordini di mesi già chiusi diventati annullati o resi e non ancora stornati, per mese di origine. */
export async function stornoInSospeso(primaDi: string): Promise<Map<string, string[]>> {
  const righe = await db()
    .select({ ordineId: ordiniChiusi.ordineId, mese: ordiniChiusi.mese })
    .from(ordiniChiusi)
    .innerJoin(ordini, eq(ordini.id, ordiniChiusi.ordineId))
    .leftJoin(ordiniStornati, eq(ordiniStornati.ordineId, ordiniChiusi.ordineId))
    .where(and(lt(ordiniChiusi.mese, primaDi), inArray(ordini.stato, ["annullato", "reso"]), isNull(ordiniStornati.ordineId)));
  const perMese = new Map<string, string[]>();
  for (const r of righe) perMese.set(r.mese, [...(perMese.get(r.mese) ?? []), r.ordineId]);
  return perMese;
}

const dallaVoce = (v: Voce) => ({
  incaricatoId: v.beneficiariaId,
  tipoVoce: v.tipo,
  base: v.base,
  percentuale: v.percentuale === null ? null : Number(v.percentuale),
  importo: v.importo,
  origineId: v.origine,
});

/**
 * Chiude il mese: fotografia dei dati, ordini del mese, voci nel registro provvigioni e storni dei resi,
 * tutto in una transazione. Un blocco esclusivo impedisce due chiusure insieme; la chiave del mese
 * e quella di ogni ordine impediscono comunque di chiudere o contare due volte.
 */
export async function chiudiMese(mese: string, utenteId: string) {
  return db().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('app.chiusura_mese'))`);
    if ((await meseDaChiudere()) !== mese) throw new ErroreChiusura("Questo mese non si può chiudere adesso: i mesi si chiudono in ordine, dopo la loro fine.");

    const { dati, versioneParametri } = await datiDelMese(mese);
    const esito = calcolaMese(dati);
    if (!esito.ok) throw new ErroreChiusura("I controlli del mese non sono superati: guarda l'anteprima.");

    await tx.insert(mesiChiusi).values({
      mese,
      parametriVersioneId: versioneParametri,
      fotografia: fotografaMese(dati),
      puntiAziendali: esito.puntiAziendali,
      incasso: esito.incasso,
      totaleCompensi: esito.totaleCompensi,
      chiusoDa: utenteId,
    });
    if (dati.ordini.length > 0) await tx.insert(ordiniChiusi).values(dati.ordini.map((o) => ({ ordineId: o.id, mese })));
    if (esito.voci.length > 0) await tx.insert(movimenti).values(esito.voci.map((v) => ({ ...dallaVoce(v), tipo: "voce" as const, mese })));

    // Storni dei resi dopo la chiusura del loro mese: a percentuali ferme, dal mese che si chiude ora.
    let totaleStorni = 0n;
    const ordiniResi: string[] = [];
    for (const [origine, nuovi] of [...(await stornoInSospeso(mese))].sort(([a], [b]) => (a < b ? -1 : 1))) {
      const [fotografia] = await tx.select().from(mesiChiusi).where(eq(mesiChiusi.mese, origine));
      const gia = await tx
        .select({ ordineId: ordiniStornati.ordineId })
        .from(ordiniStornati)
        .innerJoin(ordiniChiusi, eq(ordiniChiusi.ordineId, ordiniStornati.ordineId))
        .where(eq(ordiniChiusi.mese, origine));
      const voci = stornoIncrementale(
        datiDaFotografia(fotografia.fotografia),
        gia.map((g) => g.ordineId),
        nuovi,
      );
      const [r] = await tx.insert(rettifiche).values({ mese, meseOrigine: origine }).returning({ id: rettifiche.id });
      await tx.insert(ordiniStornati).values(nuovi.map((ordineId) => ({ ordineId, rettificaId: r.id })));
      if (voci.length > 0) await tx.insert(movimenti).values(voci.map((v) => ({ ...dallaVoce(v), tipo: "storno" as const, mese, rettificaId: r.id })));
      totaleStorni += voci.reduce((t, v) => t + v.importo, 0n);
      ordiniResi.push(...nuovi);
    }

    // Licenze non rinnovate entro la fine di questo mese (il mese dopo la scadenza): dirette e clienti passano alla
    // sponsor, l'incaricata torna cliente (sezione 3a). Dopo la fotografia: il mese chiuso resta come era.
    const decadute = await applicaDecadenze(tx, mese, dati.parametri, utenteId);

    await registra(tx, {
      utenteId,
      azione: "provvigioni.mese_chiuso",
      entita: "mese",
      entitaId: mese,
      dopo: {
        ordini: dati.ordini.length,
        voci: esito.voci.length,
        totaleCompensi: esito.totaleCompensi.toString(),
        versioneParametri: versioneParametri.toString(),
        ordiniStornati: ordiniResi.length,
        totaleStorni: totaleStorni.toString(),
        licenzeDecadute: decadute,
      },
    });
    return { voci: esito.voci.length, totaleCompensi: esito.totaleCompensi, ordiniStornati: ordiniResi.length, totaleStorni, licenzeDecadute: decadute };
  });
}
