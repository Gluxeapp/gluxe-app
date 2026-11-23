import { Suspense } from "react";
import { Avviso, Caricamento, Titolo } from "@/components/ui";
import { richiediCliente } from "@/lib/accesso";
import { clienteVipOggi } from "@/lib/clienti-vip";
import { fraseVipDelCarrello, vetrinaProdotti } from "@/lib/negozio";
import { consulenteDi } from "@/lib/profilo-cliente";
import { pagamentiAttivi } from "@/lib/stripe";
import { ChiediConsulente, ModuloCarrello } from "./moduli";

export const metadata = { title: "Acquista · Clienti G LUXE" };

export default function Acquista() {
  return (
    <Suspense fallback={<Caricamento />}>
      <Contenuto />
    </Suspense>
  );
}

async function Contenuto() {
  const { cliente } = await richiediCliente();
  const consulente = await consulenteDi(cliente.incaricatoId);
  if (!pagamentiAttivi()) {
    return (
      <>
        <Titolo>Ciao {cliente.nome}</Titolo>
        <Avviso>Il pagamento online sarà attivo a breve.</Avviso>
      </>
    );
  }
  // Cliente VIP (decisione 35): dal profilo i prodotti a listino hanno il prezzo VIP.
  const { vip, validaFino } = await clienteVipOggi(cliente.id);
  const [vetrina, fraseVip] = await Promise.all([vetrinaProdotti({ vip }), fraseVipDelCarrello([], validaFino)]);
  return (
    <>
      <Titolo sottotitolo={consulente ? `La tua consulente: ${consulente.nome}` : "Per il primo acquisto ti serve il codice della tua consulente."}>
        Ciao {cliente.nome}
      </Titolo>
      {!consulente && (
        <div className="mb-6">
          <ChiediConsulente />
        </div>
      )}
      <ModuloCarrello
        prodotti={vetrina.prodotti}
        spedizione={vetrina.spedizione}
        serveCodice={!consulente}
        fraseVip={fraseVip}
        indirizzo={{
          destinatario: `${cliente.nome} ${cliente.cognome}`,
          indirizzo: cliente.indirizzo ?? "",
          cap: cliente.cap ?? "",
          citta: cliente.citta ?? "",
          provincia: cliente.provincia ?? "",
          telefono: cliente.telefono,
        }}
      />
    </>
  );
}
