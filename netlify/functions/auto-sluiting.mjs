// Geplande functie: leest de bewaarde berichten en zet een zekere sluiting
// vanzelf op de website. Geen mens in de lus — anders staat de apotheek op
// de site open terwijl ze dicht is, enkel omdat niemand /beheer/ opende.
//
// De regels staan in lib/sluitingen.mjs, dezelfde die de API en de herscan
// gebruiken: zeker gaat meteen op de site met een melding in /beheer/, de rest
// blijft een voorstel met Toevoegen. Die tik verdwijnt dus alleen waar hij
// niets toevoegt.
//
// De code komt uit de omgeving (BEHEER_CODE), niet uit een header: er is geen
// beller om ze mee te geven. Staat ze niet ingesteld, dan schrijft deze functie
// niets, net zoals de API zonder code niemand laat schrijven.

import { getStore } from "@netlify/blobs";
import { verwerkBerichten } from "./lib/sluitingen.mjs";

const STORE = "vansuyt";
const CODE = process.env.BEHEER_CODE || "";

export default async () => {
  if (!CODE) {
    console.log("auto-sluiting: geen BEHEER_CODE ingesteld, niets gedaan");
    return new Response("geen code", { status: 200 });
  }

  const store = getStore({ name: STORE, consistency: "strong" });
  const berichten = (await store.get("berichten", { type: "json" })) || [];
  const { toegepast } = await verwerkBerichten(store, berichten);

  for (const m of toegepast) {
    console.log(`auto-sluiting: ${m.soort} ${m.from} tot ${m.to} ("${m.reason}") uit bericht ${m.berichtId}`);
  }
  console.log(`auto-sluiting: ${toegepast.length} toegepast van ${Array.isArray(berichten) ? berichten.length : 0} berichten`);
  return new Response(`${toegepast.length} toegepast`, { status: 200 });
};

// Elk uur. Een bericht van vanmorgen hoort niet tot vannacht te wachten, en
// elke tien minuten was alleen om het de eerste avond te zien werken.
export const config = { schedule: "@hourly" };
