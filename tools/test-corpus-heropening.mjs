// Overgenomen uit Tess' testrapport 4 (test/voorstellen4/corpus-heropening.mjs).
import { verwerkBerichten } from "../netlify/functions/lib/sluitingen.mjs";
const maakStore = () => { const data = new Map(); return { data, async get(k){return data.has(k)?JSON.parse(JSON.stringify(data.get(k))):null}, async setJSON(k,v){data.set(k,JSON.parse(JSON.stringify(v)))} }; };
const NU = new Date("2026-12-01T10:00:00");
const zinnen = process.argv.slice(2);
const lijst = [
 ["Op 4 januari zijn wij er terug.", "2026-12-01"],
 ["Vanaf 4 januari zijn wij er weer.", "2026-12-01"],
 ["Vanaf 4 januari staan wij weer voor u klaar.", "2026-12-01"],
 ["Wij zijn tot 4 januari met verlof.", "2026-12-01"],
 ["Op 4 januari zijn we weer bereikbaar na de feestdagen en ons verlof.", "2026-12-01"],
 ["Verlof tot en met 3 januari, tot op 4 januari!", "2026-12-01"],
 ["Vakantie. Maandag 4 januari staan we weer voor u klaar.", "2026-12-01"],
 ["Wij zijn terug van vakantie op 4 januari.", "2026-12-01"],
 ["Na onze vakantie zijn we er vanaf 4 januari weer.", "2026-12-01"],
 ["Einde sluiting op 4 januari.", "2026-12-01"],
 ["De sluiting eindigt op 3 januari.", "2026-12-01"],
 ["Onze sluiting duurt tot en met 3 januari.", "2026-12-01"],
 ["Heropening na de vakantie op 4 januari.", "2026-12-01"],
 ["Wij heropenen op 4 januari na de vakantie.", "2026-12-01"],
 ["Wij zijn verhuisd! Vanaf 4 januari vindt u ons op een nieuw adres; de oude apotheek is dicht.", "2026-12-01"],
 ["De apotheek is de hele winter dicht op zondag, ook op 6 december.", "2026-12-01"],
 ["Wij sluiten onze deuren op 31 december om 17u.", "2026-12-01"],
 ["Gesloten op oudejaarsavond 31 december.", "2026-12-01"],
 ["Op 24 december zijn wij gesloten vanaf 16u30.", "2026-12-01"],
 ["Kerstmis: gesloten op 25 december en 26 december.", "2026-12-01"],
 ["Kerstmis en Nieuwjaar: gesloten van 24 tot en met 26 december en op 1 januari.", "2026-12-01"],
 ["Tijdens de kerstperiode gesloten van 24 december tot 1 januari.", "2026-12-01"],
 ["Gesloten van 24 december tot 1 januari", "2026-12-01"],
 ["Wij zijn gesloten van 24 december tot 1 januari 2027.", "2026-12-01"],
];
for (const [t,d] of lijst) {
  const store = maakStore();
  const uit = await verwerkBerichten(store,[{id:"b",titel:"",tekst:t,datum:d+"T09:00:00.000Z"}],{nu:NU});
  console.log(t.padEnd(95), "=>", uit.toegepast.map(m=>`${m.soort}:${m.from}..${m.to} "${m.reason}"`).join(", ")||"-", "| voorstel:", uit.lijst.filter(v=>!v.toegepast).map(v=>`${v.from}..${v.to}`).join(",")||"-");
}
