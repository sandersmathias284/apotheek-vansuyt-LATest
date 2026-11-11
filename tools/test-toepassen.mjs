// Test van het toepassen zelf, zonder Netlify: een nagemaakte blob-store.
//   node tools/test-toepassen.mjs
//
// De vraag die deze tests bewaken: wat gaat er vanzelf op de website, en wat
// blijft een voorstel dat zij moet bevestigen?

import { verwerkBerichten, cleanVoorstellen } from "../netlify/functions/lib/sluitingen.mjs";

let goed = 0;
let fout = 0;

// Nagemaakte store: een Map met dezelfde twee methodes die de code gebruikt.
const maakStore = (begin = {}) => {
  const data = new Map(Object.entries(begin));
  return {
    data,
    async get(sleutel) { return data.has(sleutel) ? JSON.parse(JSON.stringify(data.get(sleutel))) : null; },
    async setJSON(sleutel, waarde) { data.set(sleutel, JSON.parse(JSON.stringify(waarde))); },
  };
};

const bericht = (id, titel, tekst, datum) => ({ id, titel, tekst, datum: `${datum}T09:00:00.000Z` });

const kort = (lijst) =>
  lijst.map((v) => `${v.toegepast ? "melding" : "voorstel"} ${v.soort} ${v.from}..${v.to}`).sort().join(" | ") || "(leeg)";

const test = async (naam, doeHet, verwacht) => {
  let uit = "";
  try {
    uit = await doeHet();
  } catch (e) {
    fout++;
    console.log(`FOUT  ${naam}\n      wierp een fout: ${e.message}`);
    return;
  }
  if (uit === verwacht) {
    goed++;
    console.log(`ok    ${naam}\n      ${uit}`);
  } else {
    fout++;
    console.log(`FOUT  ${naam}\n      verwacht: ${verwacht}\n      gekregen: ${uit}`);
  }
};

const NU = new Date("2026-11-11T08:00:00.000Z");

console.log("Toepassen: wat gaat vanzelf op de website?\n");

// ---------- zeker: meteen toepassen ----------
await test("T1. zekere sluiting komt meteen in closures", async () => {
  const store = maakStore();
  const b = [bericht("b1", "Apotheek gesloten van 11 tot en met 15 november", "Wij nemen een brug van woensdag 11 november tot en met zondag 15 november.", "2026-11-07")];
  const uit = await verwerkBerichten(store, b, { nu: NU });
  const c = uit.closures.map((x) => `${x.from}..${x.to} "${x.reason}"`).join(", ");
  return `${c} :: ${kort(uit.lijst)}`;
}, ' 2026-11-11..2026-11-15 "Brugdagen" :: melding gesloten 2026-11-11..2026-11-15'.trim());

await test("T2. de melding zegt dat klanten het al zien", async () => {
  const store = maakStore();
  const b = [bericht("b1", "", "Wij zijn gesloten van 11 tot en met 15 november.", "2026-11-07")];
  const uit = await verwerkBerichten(store, b, { nu: NU });
  return String(uit.toegepast[0].nuZichtbaar);
}, "true");

await test("T3. een periode verderop is niet 'nu zichtbaar'", async () => {
  const store = maakStore();
  const b = [bericht("b1", "", "Wij zijn gesloten van 2 tot en met 4 februari.", "2026-11-10")];
  const uit = await verwerkBerichten(store, b, { nu: NU });
  return `${uit.toegepast[0].from} nuZichtbaar=${uit.toegepast[0].nuZichtbaar}`;
}, "2027-02-02 nuZichtbaar=false");

// ---------- niet zeker: voorstel ----------
await test("T4. een opsomming van losse dagen wordt nooit vanzelf toegepast", async () => {
  const store = maakStore();
  const b = [bericht("b1", "Feestdagen", "Wij zijn gesloten op 24 en 31 december.", "2026-12-01")];
  const uit = await verwerkBerichten(store, b, { nu: NU });
  return `${uit.closures.length} sluiting(en) :: ${kort(uit.lijst)}`;
}, "0 sluiting(en) :: voorstel gesloten 2026-12-24..2026-12-24 | voorstel gesloten 2026-12-31..2026-12-31");

await test("T5. een periode die haar eigen sluiting raakt blijft een voorstel", async () => {
  const store = maakStore({ closures: [{ id: "c1", from: "2026-11-12", to: "2026-11-13", reason: "Jaarlijkse vakantie", note: "" }] });
  const b = [bericht("b1", "", "Wij zijn gesloten van 11 tot en met 15 november.", "2026-11-07")];
  const uit = await verwerkBerichten(store, b, { nu: NU });
  return `${uit.closures.map((c) => `${c.from}..${c.to}`).join(",")} :: ${kort(uit.lijst)}`;
}, "2026-11-12..2026-11-13 :: voorstel gesloten 2026-11-11..2026-11-15");

await test("T6. een periode die al voorbij is blijft een voorstel", async () => {
  const store = maakStore();
  const b = [bericht("b1", "", "Wij zijn gesloten van 3 maart tot en met 6 maart.", "2026-02-20")];
  const uit = await verwerkBerichten(store, b, { nu: NU });
  return `${uit.closures.length} sluiting(en) :: ${kort(uit.lijst)}`;
}, "0 sluiting(en) :: voorstel gesloten 2026-03-03..2026-03-06");

await test("T7. een bericht zonder leesbare sluiting verandert niets", async () => {
  const store = maakStore();
  const b = [bericht("b1", "", "De verzorgingsproducten van Ray krijgen een mooie korting in de week van 20-28 november 2026 !", "2026-11-09")];
  const uit = await verwerkBerichten(store, b, { nu: NU });
  return `${uit.closures.length} sluiting(en) :: ${kort(uit.lijst)}`;
}, "0 sluiting(en) :: (leeg)");

// ---------- open-dag ----------
await test("T8. een open-bereik zet de feestdagen uit, niet een sluiting", async () => {
  const store = maakStore();
  const b = [bericht("b1", "Kerstperiode", "Wij zijn gewoon open van 24 december tot en met 2 januari.", "2026-12-01")];
  const uit = await verwerkBerichten(store, b, { nu: NU });
  return `${uit.closures.length} sluiting(en), feestdagOpen=${uit.feestdagOpen.join(",")} :: ${kort(uit.lijst)}`;
}, "0 sluiting(en), feestdagOpen=2026-12-25,2027-01-01 :: melding open 2026-12-24..2027-01-02");

// ---------- niet twee keer ----------
await test("T9. twee keer draaien geeft geen tweede sluiting", async () => {
  const store = maakStore();
  const b = [bericht("b1", "", "Wij zijn gesloten van 11 tot en met 15 november.", "2026-11-07")];
  await verwerkBerichten(store, b, { nu: NU });
  const uit = await verwerkBerichten(store, b, { nu: NU });
  return `${uit.closures.length} sluiting(en) :: ${kort(uit.lijst)}`;
}, "1 sluiting(en) :: melding gesloten 2026-11-11..2026-11-15");

await test("T10. teruggedraaid (in de weg-lijst) komt niet terug", async () => {
  const store = maakStore({ "closure-voorstellen-weg": ["2026-11-11|2026-11-15"] });
  const b = [bericht("b1", "", "Wij zijn gesloten van 11 tot en met 15 november.", "2026-11-07")];
  const uit = await verwerkBerichten(store, b, { nu: NU });
  return `${uit.closures.length} sluiting(en) :: ${kort(uit.lijst)}`;
}, "0 sluiting(en) :: (leeg)");

// ---------- oudere lezer ----------
await test("T11. een voorstel dat de lezer niet meer maakt, verdwijnt", async () => {
  const store = maakStore({
    "closure-voorstellen": [{
      id: "oud", berichtId: "b1", berichtDatum: "2026-11-07T09:00:00.000Z", berichtTitel: "",
      soort: "open", from: "2026-11-11", to: "2026-11-11", reason: "Wapenstilstand",
      gemaakt: "2026-11-07T09:00:00.000Z",
    }],
  });
  const b = [bericht("b1", "", "Op 11 november zijn wij niet open.", "2026-11-07")];
  const uit = await verwerkBerichten(store, b, { nu: NU });
  return kort(uit.lijst);
}, "voorstel gesloten 2026-11-11..2026-11-11");

await test("T12. een melding van een voorbije periode valt weg", async () => {
  const lijst = cleanVoorstellen([
    { id: "m1", soort: "gesloten", from: "2026-10-01", to: "2026-10-05", toegepast: true, berichtDatum: "2026-09-01T09:00:00.000Z" },
    { id: "m2", soort: "gesloten", from: "2026-11-11", to: "2026-11-15", toegepast: true, berichtDatum: "2026-11-07T09:00:00.000Z" },
  ], "2026-11-11");
  return kort(lijst);
}, "melding gesloten 2026-11-11..2026-11-15");


// ---------- De blokkerende bevindingen uit testrapport 4 ----------
// De zinnen staan hier letterlijk zoals Tess ze schreef. Elk van deze zette
// vroeger vanzelf iets op de publieke site.
console.log("\nBlokkerend uit testrapport 4: komt dit nog vanzelf op de site?\n");

const nietVanzelf = async (naam, tekst, datum = "2026-11-10", titel = "") => {
  await test(naam, async () => {
    const store = maakStore();
    const uit = await verwerkBerichten(store, [bericht("b1", titel, tekst, datum)], { nu: NU });
    return `${uit.closures.length} sluiting(en), ${uit.feestdagOpen.length} open-dag(en)`;
  }, "0 sluiting(en), 0 open-dag(en)");
};

// B1 — de zin gaat niet over de apotheek
await nietVanzelf("B1a. promotie met het woord vakantie", "Vakantie-actie: zonnecrème aan -20% van 12 tot en met 18 november.");
await nietVanzelf("B1b. vakantievaccinaties", "Reisadvies en vakantievaccinaties: elke dag van 12 tot en met 14 november.");
await nietVanzelf("B1c. dicht bij u", "Griepvaccinatie: dicht bij u, elke dag van 12 tot en met 14 november.");
await nietVanzelf("B1d. de huisarts", "De huisarts is met verlof van 11 tot en met 15 november, voor dringende zaken kunt u bij ons terecht.");
await nietVanzelf("B1e. de leverancier", "Onze leverancier is gesloten van 11 tot en met 15 november, leveringen kunnen vertragen.");
await nietVanzelf("B1f. de inschrijvingen sluiten", "De inschrijvingen voor de griepvaccinatie sluiten op 20 november.");

// B2 — een loket of webshop is niet de deur van de apotheek
await nietVanzelf("B2a. inschrijvingsloket", "Het inschrijvingsloket voor de griepprik is open van 9 tot en met 13 november.");
await nietVanzelf("B2b. webshop", "Op 11 november openen wij onze nieuwe webshop.");
await nietVanzelf("B2c. open huis", "Open huis op 11 november, kom langs voor een gratis bloeddruk.");

// B3 — half gelezen mag nooit zeker zijn
await nietVanzelf("B3a. 24/12 en 31/12", "Wij zijn gesloten op 24/12 en 31/12.", "2026-12-01");
// Deze leest de lezer nu volledig (12 en 13 november liggen aan elkaar), dus
// ze mag wel vanzelf — maar dan de hele periode, niet de helft.
await test("B3b. en ook op 13 november wordt volledig gelezen", async () => {
  const store = maakStore();
  const uit = await verwerkBerichten(store, [bericht("b1", "", "Wij zijn gesloten op 12 november en ook op 13 november.", "2026-11-10")], { nu: NU });
  return uit.closures.map((c) => c.from + ".." + c.to).join(", ") || "niets";
}, "2026-11-12..2026-11-13");
await nietVanzelf("B3c. twee bereiken", "Wij zijn gesloten van 11 tot en met 15 november en van 24 december tot en met 2 januari.");
await nietVanzelf("B3d. tweede zin met een andere datum", "Gesloten op 12 november. Wij zijn ook gesloten op 24 december.");

// B4 — heropeningstaal sluit de dag dat ze terug is
await nietVanzelf("B4a. heropening", "Heropening na de vakantie op 4 januari.", "2026-12-01");
await nietVanzelf("B4b. wij heropenen", "Wij heropenen op 4 januari na de vakantie.", "2026-12-01");
await nietVanzelf("B4c. terug van vakantie", "Wij zijn terug van vakantie op 4 januari.", "2026-12-01");
await nietVanzelf("B4d. einde sluiting", "Einde sluiting op 4 januari.", "2026-12-01");

// B5 — een correctie is nooit zeker
await nietVanzelf("B5a. update toch open", "Update: wij zijn toch open op donderdag 12 november.", "2026-11-10", "Gesloten van 11 tot en met 15 november");
await nietVanzelf("B5b. sluiting geannuleerd", "Update: de sluiting is geannuleerd, wij zijn gewoon open.", "2026-11-10", "Gesloten van 11 tot en met 15 november");
await nietVanzelf("B5c. al op 13 november terug open", "Update: wegens de goede evolutie zijn wij al op 13 november terug open.", "2026-11-10", "Gesloten van 11 tot en met 15 november");

// B6 — een deel van de dag, in letters
await nietVanzelf("B6a. om vijf uur", "Op 13 november sluiten wij om vijf uur.");
await nietVanzelf("B6b. om half vijf", "Op 13 november sluiten wij om half vijf.");
await nietVanzelf("B6c. tijdens de lunch", "Op 13 november zijn wij tijdens de lunch gesloten.");
await nietVanzelf("B6d. een uurtje", "Op 13 november zijn wij een uurtje gesloten.");

// B7 — ontkenning op afstand
await nietVanzelf("B7a. geen sprake van", "Er is geen sprake van een sluiting van 11 tot en met 15 november.");
await nietVanzelf("B7b. geen plannen", "Er zijn geen plannen om te sluiten van 11 tot en met 15 november.");

// Weekdag die niet bij de datum past, en een jaar ver weg
await nietVanzelf("W1. woensdag 12 november is een donderdag", "Wij zijn gesloten op woensdag 12 november.");
await nietVanzelf("W2. maandag 11 november is een woensdag", "Wij zijn gesloten van maandag 11 tot en met vrijdag 15 november.");
await nietVanzelf("W3. terugblik wordt volgend jaar", "Bedankt voor uw begrip tijdens onze sluiting van 1 tot en met 5 oktober.", "2026-11-15");
await nietVanzelf("W4. vorig jaar", "Vorig jaar waren wij gesloten van 24 december tot en met 2 januari.");
await nietVanzelf("W5. een jaar ver weg", "Wij zijn gesloten op 11 november 2036.");

// En het echte bericht blijft wél vanzelf gaan
await test("W6. het brugbericht van 7 november gaat nog altijd vanzelf", async () => {
  const store = maakStore();
  const b = [bericht("b1", "Apotheek gesloten van 11 tot en met 15 november", "Wij nemen een brug van woensdag 11 november tot en met zondag 15 november.", "2026-11-07")];
  const uit = await verwerkBerichten(store, b, { nu: NU });
  return uit.closures.map((c) => `${c.from}..${c.to} "${c.reason}"`).join(", ");
}, '2026-11-11..2026-11-15 "Brugdagen"');

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
