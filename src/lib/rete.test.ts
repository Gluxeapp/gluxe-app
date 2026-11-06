import { describe, expect, test } from "vitest";
import { PARAMETRI_INIZIALI as P } from "./parametri";
import { avanzamentoQualifica, costruisciAlbero, contaRete, prossimoTitolo, type PersonaRete } from "./rete";

const persone: PersonaRete[] = [
  { id: "sponsor", sponsorId: null, codice: "GL000001", nome: "Sponsor Sopra", stato: "attivo" },
  { id: "anna", sponsorId: "sponsor", codice: "GL000002", nome: "Anna A", stato: "attivo" },
  { id: "bea", sponsorId: "anna", codice: "GL000003", nome: "Bea B", stato: "attivo" },
  { id: "cleo", sponsorId: "bea", codice: "GL000004", nome: "Cleo C", stato: "sospeso" },
  { id: "dora", sponsorId: "anna", codice: "GL000005", nome: "Dora D", stato: "attivo" },
  { id: "altra", sponsorId: "sponsor", codice: "GL000006", nome: "Altra Rete", stato: "attivo" },
];

describe("Albero della rete", () => {
  test("contiene solo la downline della radice, in ordine di codice, con il livello", () => {
    const albero = costruisciAlbero("anna", persone)!;
    expect(albero.codice).toBe("GL000002");
    expect(albero.livello).toBe(0);
    expect(albero.figli.map((f) => f.id)).toEqual(["bea", "dora"]);
    expect(albero.figli[0].figli[0]).toMatchObject({ id: "cleo", livello: 2 });
    const tutti: string[] = [];
    const visita = (n: typeof albero) => {
      tutti.push(n.id);
      n.figli.forEach(visita);
    };
    visita(albero);
    // Né la sponsor di Anna né un'altra rete.
    expect(tutti.sort()).toEqual(["anna", "bea", "cleo", "dora"]);
  });

  test("telefono ed email solo delle dirette, anche se arrivano dati di altri (regola 15)", () => {
    const contatti = new Map([
      ["bea", { telefono: "3330000001", email: "bea@prova.test" }],
      ["cleo", { telefono: "3330000002", email: "cleo@prova.test" }],
      ["anna", { telefono: "3330000003", email: "anna@prova.test" }],
    ]);
    const albero = costruisciAlbero("anna", persone, contatti)!;
    expect(albero.contatti).toBeUndefined();
    expect(albero.figli[0].contatti).toEqual({ telefono: "3330000001", email: "bea@prova.test" });
    expect(albero.figli[0].figli[0].contatti).toBeUndefined();
    expect(albero.figli[1].contatti).toBeUndefined();
  });

  test("un nodo porta solo i campi consentiti", () => {
    const albero = costruisciAlbero("anna", persone)!;
    expect(Object.keys(albero).sort()).toEqual(["codice", "figli", "id", "livello", "nome", "stato"]);
  });

  test("radice inesistente: nessun albero", () => {
    expect(costruisciAlbero("nessuna", persone)).toBeNull();
  });

  test("conteggi della rete: persone e livelli (la radice esclusa)", () => {
    const albero = costruisciAlbero("anna", persone)!;
    expect(contaRete(albero)).toEqual({ persone: 3, dirette: 2, livelli: 2 });
  });
});

describe("Avanzamento", () => {
  const c = (n: number) => BigInt(Math.round(n * 100));

  test("verso la qualifica successiva: punti mancanti e percentuale", () => {
    expect(avanzamentoQualifica(c(450), P.qualifiche)).toEqual({
      attuale: "New Star",
      prossima: "Partner",
      soglia: c(600),
      mancano: c(150),
      percentuale: 75,
    });
  });

  test("nessuna qualifica e qualifica massima", () => {
    expect(avanzamentoQualifica(0n, P.qualifiche)).toMatchObject({ attuale: null, prossima: "New Star", percentuale: 0 });
    expect(avanzamentoQualifica(c(15000), P.qualifiche)).toMatchObject({ attuale: "Leader", prossima: null, mancano: 0n, percentuale: 100 });
  });

  test("soglia esatta: si è già nella qualifica", () => {
    expect(avanzamentoQualifica(c(600), P.qualifiche)).toMatchObject({ attuale: "Partner", prossima: "Expert" });
  });

  test("titolo manager successivo in base alle linee forti", () => {
    expect(prossimoTitolo(0, P.titoli)).toEqual({ attuale: null, prossimo: "Leader in crescita", lineeMancanti: 1 });
    expect(prossimoTitolo(3, P.titoli)).toEqual({ attuale: "Prestige Director", prossimo: "President", lineeMancanti: 1 });
    expect(prossimoTitolo(7, P.titoli)).toEqual({ attuale: "Diamond President", prossimo: null, lineeMancanti: 0 });
  });
});
