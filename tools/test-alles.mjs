// Alles in één keer:
//   node tools/test-alles.mjs
//
// 1. de lezer (tools/test-sluiting-lezen.mjs)
// 2. het toepassen (tools/test-toepassen.mjs)
// 3. de twee testlijsten van Tess (test-corpus-*.mjs): 204 zinnen waarvan er
//    geen enkele vanzelf iets verkeerds op de publieke site mag zetten.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const hier = dirname(fileURLToPath(import.meta.url));
const stappen = [
  ["De lezer", "test-sluiting-lezen.mjs"],
  ["Het toepassen", "test-toepassen.mjs"],
  ["Testlijst van Tess: wat komt er vanzelf op de site?", "test-corpus-automatisch.mjs"],
];

let fout = 0;
for (const [naam, bestand] of stappen) {
  console.log(`\n=== ${naam} (${bestand}) ===`);
  const uit = spawnSync(process.execPath, [join(hier, bestand)], { encoding: "utf8" });
  const regels = (uit.stdout || "").trimEnd().split("\n");
  // Alleen de staart tonen; de volle uitvoer staat in het bestand zelf.
  console.log(regels.slice(-3).join("\n"));
  if (uit.stderr) console.log(uit.stderr.trimEnd());
  if (uit.status !== 0) fout++;
}

console.log(fout ? `\n${fout} van de ${stappen.length} onderdelen faalt.` : `\nAlle ${stappen.length} onderdelen in orde.`);
process.exit(fout ? 1 : 0);
