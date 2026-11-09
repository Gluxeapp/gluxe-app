import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { incaricati, movimenti } from "@/db/schema";
import { richiediStaff } from "@/lib/accesso";
import { ETICHETTE_REGIME } from "@/lib/provvigioni/documento";
import { documentiDelPeriodo } from "@/lib/provvigioni/conti";
import { ETICHETTE_VOCE, MESE_VALIDO } from "@/lib/provvigioni/dati";
import { TIPI_VOCE } from "@/lib/provvigioni/motore";
import { registra } from "@/lib/registro";

/**
 * Export per il commercialista, in CSV (si apre con Excel): separatore ";" e virgola decimale.
 * ?tipo=documenti&mese=AAAA-MM → ricevute e fatture con data nel mese (pagamenti, ritenute, IVA, INPS, bollo).
 * ?tipo=compensi&mese=AAAA-MM → compensi del mese chiuso per incaricata e per voce, con i dati fiscali.
 */

const cella = (v: string | number | bigint | null | undefined) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const euro = (c: bigint) => `${c < 0n ? "-" : ""}${(c < 0n ? -c : c) / 100n},${((c < 0n ? -c : c) % 100n).toString().padStart(2, "0")}`;
const csv = (righe: (string | number | bigint | null | undefined)[][]) => "﻿" + righe.map((r) => r.map(cella).join(";")).join("\r\n") + "\r\n";

const TIPI_DOCUMENTO = { ricevuta: "Ricevuta", fattura_ordinaria: "Fattura proforma (IVA)", fattura_forfettaria: "Fattura proforma (forfettario)" } as const;

export async function GET(richiesta: Request) {
  const staff = await richiediStaff(["amministrazione", "contabilita"]);
  const url = new URL(richiesta.url);
  const tipo = url.searchParams.get("tipo");
  const mese = url.searchParams.get("mese") ?? "";
  if (!MESE_VALIDO.test(mese) || (tipo !== "documenti" && tipo !== "compensi")) return new Response("Richiesta non valida", { status: 400 });

  let contenuto: string;
  if (tipo === "documenti") {
    const docs = await documentiDelPeriodo(mese);
    contenuto = csv([
      ["Data", "Numero", "Tipo", "Codice", "Cognome", "Nome", "Codice fiscale", "Partita IVA", "Competenza", "Imponibile", "IVA", "Ritenuta", "INPS incaricata", "INPS azienda", "Bollo", "Totale bonifico", "Stato"],
      ...docs.map(({ documento: d, stato }) => {
        const i = d.incaricata as { codice: string; nome: string; cognome: string; codiceFiscale: string; partitaIva: string | null };
        return [
          d.data,
          `${d.numero}/${d.anno}`,
          TIPI_DOCUMENTO[d.tipo],
          i.codice,
          i.cognome,
          i.nome,
          i.codiceFiscale,
          i.partitaIva,
          d.competenza,
          euro(d.imponibile),
          euro(d.iva),
          euro(d.ritenuta),
          euro(d.inpsIncaricata),
          euro(d.inpsAzienda),
          euro(d.bollo),
          euro(d.totale),
          stato,
        ];
      }),
    ]);
  } else {
    const righe = await db()
      .select({
        codice: incaricati.codice,
        nome: incaricati.nome,
        cognome: incaricati.cognome,
        codiceFiscale: incaricati.codiceFiscale,
        partitaIva: incaricati.partitaIva,
        regime: incaricati.regimeFiscale,
        tipo: movimenti.tipo,
        tipoVoce: movimenti.tipoVoce,
        importo: sql<string>`sum(${movimenti.importo})::text`,
      })
      .from(movimenti)
      .innerJoin(incaricati, eq(incaricati.id, movimenti.incaricatoId))
      .where(sql`${movimenti.mese} = ${mese} and ${movimenti.tipo} in ('voce', 'storno')`)
      .groupBy(incaricati.id, movimenti.tipo, movimenti.tipoVoce)
      .orderBy(asc(incaricati.codice));
    const perPersona = new Map<string, { dati: (typeof righe)[number]; voci: Map<string, bigint>; storni: bigint }>();
    for (const r of righe) {
      const p = perPersona.get(r.codice) ?? { dati: r, voci: new Map(), storni: 0n };
      if (r.tipo === "storno") p.storni += BigInt(r.importo);
      else p.voci.set(r.tipoVoce!, (p.voci.get(r.tipoVoce!) ?? 0n) + BigInt(r.importo));
      perPersona.set(r.codice, p);
    }
    contenuto = csv([
      ["Codice", "Cognome", "Nome", "Codice fiscale", "Partita IVA", "Regime", ...TIPI_VOCE.map((t) => ETICHETTE_VOCE[t]), "Storni resi", "Totale"],
      ...[...perPersona.values()].map(({ dati: d, voci, storni }) => [
        d.codice,
        d.cognome,
        d.nome,
        d.codiceFiscale,
        d.partitaIva,
        ETICHETTE_REGIME[d.regime],
        ...TIPI_VOCE.map((t) => euro(voci.get(t) ?? 0n)),
        euro(storni),
        euro([...voci.values()].reduce((a, b) => a + b, 0n) + storni),
      ]),
    ]);
  }
  await registra(db(), { utenteId: staff.utenteId, azione: "contabilita.export", entita: "export", entitaId: `${tipo}-${mese}` });
  return new Response(contenuto, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gluxe-${tipo}-${mese}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
