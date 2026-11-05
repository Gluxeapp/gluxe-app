import "server-only";
import { asc, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { incaricati, leaderFondatori, qualificheBloccate, quoteSpeciali, utenti } from "@/db/schema";
import { richiediStaff } from "../accesso";
import { parametriCorrenti } from "../catalogo";
import { reteCompleta, requisitiFondatori } from "./dati";

/** Impostazioni per persona del piano compensi, per la pagina della sede (solo amministrazione). */
export async function impostazioniDelPiano() {
  await richiediStaff(["amministrazione"]);
  const persona = { codice: incaricati.codice, nome: incaricati.nome, cognome: incaricati.cognome };

  const [bloccate, fondatori, quote, esclusioni, p, rete] = await Promise.all([
    db()
      .select({ riga: qualificheBloccate, ...persona, autore: utenti.nome })
      .from(qualificheBloccate)
      .innerJoin(incaricati, eq(incaricati.id, qualificheBloccate.incaricatoId))
      .leftJoin(utenti, eq(utenti.id, qualificheBloccate.creatoDa))
      .orderBy(desc(qualificheBloccate.creatoIl)),
    db()
      .select({ riga: leaderFondatori, ...persona })
      .from(leaderFondatori)
      .innerJoin(incaricati, eq(incaricati.id, leaderFondatori.incaricatoId))
      .orderBy(asc(leaderFondatori.ingresso)),
    db()
      .select({ riga: quoteSpeciali, ...persona })
      .from(quoteSpeciali)
      .innerJoin(incaricati, eq(incaricati.id, quoteSpeciali.incaricatoId))
      .orderBy(desc(quoteSpeciali.creatoIl)),
    db()
      .select({ ...persona, esclusaPool: incaricati.esclusaPool, esclusaBonusAuto: incaricati.esclusaBonusAuto })
      .from(incaricati)
      .where(or(eq(incaricati.esclusaPool, true), eq(incaricati.esclusaBonusAuto, true)))
      .orderBy(asc(incaricati.codice)),
    parametriCorrenti(),
    reteCompleta(),
  ]);

  const requisiti = await requisitiFondatori(
    fondatori.map((f) => ({ incaricataId: f.riga.incaricatoId, ingresso: f.riga.ingresso })),
    rete.map((i) => ({ id: i.id, sponsorId: i.sponsor_id })),
    p,
  );

  return { bloccate, fondatori, quote, esclusioni, parametri: p, requisiti };
}
