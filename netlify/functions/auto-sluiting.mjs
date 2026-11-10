// Geplande functie: leest de bewaarde berichten en zet een zekere sluiting
// vanzelf op de website. Geen mens in de lus — anders staat de apotheek op
// de site open terwijl ze dicht is, enkel omdat niemand /beheer/ opende.
//
// Zeker is streng (zie lib/sluitingen.mjs): één lezing uit het bericht, een
// sluiting, één aaneengesloten periode, en ze raakt geen sluiting die de
// apotheker zelf ingaf. Alles wat niet zeker is, blijft een voorstel in
// /beheer/ dat zij bevestigt — die tik verdwijnt dus alleen waar hij niets
// toevoegt.
//
// De code komt uit de omgeving (BEHEER_CODE), niet uit een header: er is geen
// beller om ze mee te geven. Staat ze niet ingesteld, dan schrijft deze functie
// niets, net zoals de API zonder code niemand laat schrijven.

import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import { cleanClosures, zekereSluiting } from "./lib/sluitingen.mjs";

const STORE = "vansuyt";
const CODE = process.env.BEHEER_CODE || "";
const MAX_WEG = 50;

const sleutelVan = (v) => (v.soort === "open" ? `open|${v.from}|${v.to}` : `${v.from}|${v.to}`);

export default async () => {
  if (!CODE) {
    console.log("auto-sluiting: geen BEHEER_CODE ingesteld, niets gedaan");
    return new Response("geen code", { status: 200 });
  }

  const store = getStore({ name: STORE, consistency: "strong" });
  const berichten = (await store.get("berichten", { type: "json" })) || [];
  let closures = cleanClosures((await store.get("closures", { type: "json" })) || []);
  const weg = (await store.get("closure-voorstellen-weg", { type: "json" })) || [];
  const voorstellen = (await store.get("closure-voorstellen", { type: "json" })) || [];

  // Vandaag in dezelfde vorm als de datums: een periode die al voorbij is
  // hoeft niet meer toegevoegd te worden.
  const vandaag = new Date().toISOString().slice(0, 10);

  const nieuw = [];
  for (const b of Array.isArray(berichten) ? berichten : []) {
    const hit = zekereSluiting(b, closures, vandaag);
    if (!hit) continue;
    const sleutel = sleutelVan(hit);
    // Eerder al afgehandeld (toegevoegd of genegeerd)? Dan niet opnieuw.
    if (Array.isArray(weg) && weg.includes(sleutel)) continue;
    if (nieuw.some((n) => n.sleutel === sleutel)) continue;
    nieuw.push({ hit, sleutel, bericht: b });
    // Meteen meetellen, zodat twee berichten over dezelfde dagen elkaar niet
    // dubbel toevoegen.
    closures = cleanClosures([...closures, { id: `c${Date.now()}${nieuw.length}`, from: hit.from, to: hit.to, reason: hit.reason, note: "" }]);
  }

  if (!nieuw.length) {
    console.log(`auto-sluiting: niets te doen (${Array.isArray(berichten) ? berichten.length : 0} berichten)`);
    return new Response("niets te doen", { status: 200 });
  }

  await store.setJSON("closures", closures);
  // De toegepaste periodes onthouden, zodat ze niet alsnog als voorstel
  // terugkomen, en een voorstel dat er al voor stond opruimen.
  const sleutels = nieuw.map((n) => n.sleutel);
  await store.setJSON("closure-voorstellen-weg", [...sleutels, ...(Array.isArray(weg) ? weg : []).filter((k) => !sleutels.includes(k))].slice(0, MAX_WEG));
  await store.setJSON(
    "closure-voorstellen",
    (Array.isArray(voorstellen) ? voorstellen : []).filter((v) => !sleutels.includes(sleutelVan(v))),
  );

  for (const n of nieuw) {
    console.log(`auto-sluiting: ${n.hit.from} tot ${n.hit.to} ("${n.hit.reason}") uit bericht ${n.bericht.id || randomUUID()}`);
  }
  return new Response(`${nieuw.length} sluiting(en) toegevoegd`, { status: 200 });
};

// Elke 10 minuten, zodat we vanavond zien dat het werkt. Mag daarna naar
// dagelijks ("@daily").
export const config = { schedule: "*/10 * * * *" };
