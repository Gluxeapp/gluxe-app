import { describe, expect, test } from "vitest";
import { normalizzaIndirizzo, normalizzaTelefono, segnalazioniCliente, type Impronte } from "./clienti-fittizi";

const incaricata: Impronte = {
  email: "Anna.Rossi@Example.it",
  telefoni: ["+39 333 123 4567"],
  indirizzi: [{ indirizzo: "Via Roma, 10", cap: "20100" }],
  metodi: ["carta_abc"],
};

const pulito: Impronte = {
  email: "cliente@example.it",
  telefoni: ["347 000 1111"],
  indirizzi: [{ indirizzo: "Corso Italia 5", cap: "10100" }],
  metodi: ["carta_xyz"],
};

describe("Clienti fittizi (sezione 10, decisione 29)", () => {
  test("cliente vero: nessuna segnalazione", () => {
    expect(segnalazioniCliente(pulito, incaricata)).toEqual([]);
  });

  test("stessa email, anche con maiuscole diverse", () => {
    expect(segnalazioniCliente({ ...pulito, email: "anna.rossi@example.it" }, incaricata)).toEqual(["email"]);
  });

  test("stesso telefono, con o senza +39 e spazi", () => {
    expect(segnalazioniCliente({ ...pulito, telefoni: ["3331234567"] }, incaricata)).toEqual(["telefono"]);
    expect(segnalazioniCliente({ ...pulito, telefoni: ["0039 333 1234567"] }, incaricata)).toEqual(["telefono"]);
  });

  test("stesso indirizzo di consegna, scritto in modo diverso", () => {
    expect(segnalazioniCliente({ ...pulito, indirizzi: [{ indirizzo: "VIA ROMA  10", cap: "20100" }] }, incaricata)).toEqual(["indirizzo"]);
    // Stessa via ma CAP diverso: città diversa, nessuna segnalazione.
    expect(segnalazioniCliente({ ...pulito, indirizzi: [{ indirizzo: "Via Roma 10", cap: "00100" }] }, incaricata)).toEqual([]);
  });

  test("stesso metodo di pagamento", () => {
    expect(segnalazioniCliente({ ...pulito, metodi: ["carta_xyz", "carta_abc"] }, incaricata)).toEqual(["pagamento"]);
  });

  test("più motivi insieme, in ordine fisso", () => {
    expect(segnalazioniCliente({ ...incaricata }, incaricata)).toEqual(["indirizzo", "pagamento", "email", "telefono"]);
  });

  test("normalizzazioni", () => {
    expect(normalizzaTelefono("+39 333-123.4567")).toBe("3331234567");
    expect(normalizzaTelefono("")).toBe("");
    expect(normalizzaIndirizzo({ indirizzo: "Via  Roma, n.10", cap: " 20100 " })).toBe("VIA ROMA N 10|20100");
  });
});
