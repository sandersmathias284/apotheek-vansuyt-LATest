// Test van de sluitinglezer, zonder framework en zonder Netlify.
//   node tools/test-sluiting-lezen.mjs
//
// De belangrijkste test is de tweede: een bericht zonder sluitingswoord in de
// zin met de datums mag géén voorstel opleveren.

import { readFileSync } from "node:fs";
import { sluitingUitBericht, sluitingenUitBericht, redenUitBericht, feestdagenIn } from "../netlify/functions/lib/sluiting-lezen.mjs";

const kort = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 64);
const toon = (r) => (r ? `${r.soort}  ${r.from} .. ${r.to}  (${r.reason})` : "null");

let goed = 0;
let fout = 0;

// wacht = "null" of "van .. tot"; wachtSoort is "gesloten" tenzij anders gezegd
const test = (naam, bericht, wachtFrom, wachtTo, wachtSoort = "gesloten") => {
  let uit = null;
  try {
    uit = sluitingUitBericht(bericht);
  } catch (e) {
    console.log(`FOUT  ${naam}\n      wierp een fout: ${e.message}`);
    fout++;
    return;
  }
  const ok = wachtFrom === null
    ? uit === null
    : !!uit && uit.from === wachtFrom && uit.to === wachtTo && uit.soort === wachtSoort;
  if (ok) {
    goed++;
    console.log(`ok    ${naam}\n      ${toon(uit)}`);
  } else {
    fout++;
    console.log(`FOUT  ${naam}\n      verwacht: ${wachtFrom === null ? "null" : `${wachtSoort}  ${wachtFrom} .. ${wachtTo}`}\n      gekregen: ${toon(uit)}`);
  }
};

console.log("Sluitinglezer\n");

// ---------- de tabel uit de opdracht ----------
test("1. titel + tekst, dag zonder maand",
  {
    titel: "Apotheek gesloten van 11 tot en met 15 november",
    tekst: "Wij nemen een brug van woensdag 11 november tot en met zondag 15 november.",
    datum: "2026-11-07T09:00:00.000Z",
  },
  "2026-11-11", "2026-11-15");

test("2. Black friday — korting, geen sluitingswoord",
  {
    titel: "",
    tekst: "De verzorgingsproducten van Ray krijgen een mooie korting in de week van 20-28 november 2026 !",
    datum: "2026-11-07T09:00:00.000Z",
  },
  null);

test("3. over nieuwjaar, maand bij beide datums",
  { titel: "", tekst: "Wij zijn gesloten van 24 december tot en met 2 januari.", datum: "2026-12-01T09:00:00.000Z" },
  "2026-12-24", "2027-01-02");

test("4. één dag, weekdagnaam ertussen",
  { titel: "", tekst: "Uitzonderlijk gesloten op dinsdag 3 maart.", datum: "2027-02-25T09:00:00.000Z" },
  "2027-03-03", "2027-03-03");

test("5. cijfers met schuine streep",
  { titel: "", tekst: "Jaarlijks verlof van 3/9 tot 20/9.", datum: "2026-08-20T09:00:00.000Z" },
  "2026-09-03", "2026-09-20");

test("6. sluitingswoord zonder datum",
  { titel: "", tekst: "Wij zijn gesloten.", datum: "2026-11-07T09:00:00.000Z" },
  null);

test("7. einde vóór begin",
  { titel: "gesloten van 15 november tot 11 november", tekst: "", datum: "2026-11-07T09:00:00.000Z" },
  null);

// ---------- extra, zelf toegevoegd ----------
test("8. cijfers met streepje, over nieuwjaar",
  { titel: "", tekst: "De apotheek is gesloten van 24-12 tot 2-1.", datum: "2026-12-01T09:00:00.000Z" },
  "2026-12-24", "2027-01-02");

test("9. jaartal in het bericht zelf",
  { titel: "", tekst: "Jaarlijkse vakantie van 3/9/2027 tot 20/9/2027.", datum: "2026-08-20T09:00:00.000Z" },
  "2027-09-03", "2027-09-20");

test("10. sluitingswoord in een ándere zin dan de datums",
  {
    titel: "",
    tekst: "Wij zijn gesloten op feestdagen. De nieuwe cosmetica zijn er van 20 november tot 28 november.",
    datum: "2026-11-07T09:00:00.000Z",
  },
  null);

test("11. openingsuren, geen periode",
  { titel: "", tekst: "Op woensdag zijn wij gesloten van 12 tot 13 uur.", datum: "2026-11-07T09:00:00.000Z" },
  null);

test("12. telefoonnummer in de zin met het sluitingswoord",
  { titel: "", tekst: "Wij zijn gesloten, bel 051 55 11 22 of 058/23 45 67.", datum: "2026-11-07T09:00:00.000Z" },
  null);

test("13. afkorting met punt (nov.)",
  { titel: "", tekst: "Brugdag: gesloten van 11 tot en met 15 nov.", datum: "2026-11-07T09:00:00.000Z" },
  "2026-11-11", "2026-11-15");

test("14. langer dan 60 dagen",
  { titel: "", tekst: "Gesloten van 1 september tot en met 20 december.", datum: "2026-08-20T09:00:00.000Z" },
  null);

test("15. periode die al voorbij was toen het bericht geschreven werd",
  { titel: "", tekst: "Wij waren gesloten van 20 oktober tot en met 25 oktober.", datum: "2026-11-07T09:00:00.000Z" },
  null);

test("15b. periode die nog loopt op de dag van het bericht",
  { titel: "", tekst: "Wij zijn gesloten van 9 tot en met 12 november.", datum: "2026-11-10T09:00:00.000Z" },
  "2026-11-09", "2026-11-12");

test("16. datum die niet bestaat",
  { titel: "", tekst: "Gesloten op 31 februari.", datum: "2026-11-07T09:00:00.000Z" },
  null);

test("17. geen titel, geen tekst",
  { titel: "", tekst: "", datum: "2026-11-07T09:00:00.000Z" },
  null);

// ---------- uit het testrapport van Tess (2026-11-10) ----------
// De zinnen staan hier letterlijk zoals zij ze gebruikte. Berichten van
// 2026-11-10, tenzij anders vermeld.
const tess = (naam, tekst, from, to, datum = "2026-11-10T09:00:00.000Z") =>
  test(naam, { titel: "", tekst, datum }, from, to);

tess("20. twee losse dagen: op 20 en 21 november",
  "Gesloten op 20 en 21 november.", "2026-11-20", "2026-11-21");

tess("21. half bereik: gesloten tot 25 november",
  "De apotheek is gesloten tot 25 november.", null);

tess("22. half bereik: vanaf 11 november",
  "De apotheek is gesloten vanaf 11 november.", null);

tess("23. punt na maandafkorting en in t.e.m.",
  "Wij zijn gesloten van 1 dec. t.e.m. 3 dec.", "2026-12-01", "2026-12-03");

tess("24. punt na maandafkorting met tot",
  "Wij zijn gesloten van 5 dec. tot 7 dec.", "2026-12-05", "2026-12-07");

tess("25. puntkomma knipt de zin ook",
  "Wij zijn gesloten op zondag; de actie loopt van 21 tot en met 29 november.", null);

tess("26. vroeger sluiten om 17u is geen sluitingsdag",
  "Wij sluiten vroeger op 12 december om 17u.", null);

tess("27. gesloten om 18 uur is geen sluitingsdag",
  "Wij zijn op 13 december om 18 uur gesloten.", null);

tess("28. verleden tijd: periode al voorbij",
  "Wij waren gesloten op 5 november.", null);

tess("29. punt met hoofdletter erna blijft een zinseinde",
  "Gesloten op 5 dec. De actie loopt van 20 tot 28 november.", "2026-12-05", "2026-12-05");

tess("30. t/m met afkortingen, zonder punten",
  "Wij zijn gesloten van 2 dec t/m 4 dec.", "2026-12-02", "2026-12-04");

tess("31. één dag, jaar volgt het bericht",
  "Brugdag op 14 mei.", "2027-05-14", "2027-05-14");

// ---------- Het bericht gaat vóór de feestdagenlijst (opdracht 2) ----------
console.log("\nOpen op een feestdag\n");

const opendag = (naam, tekst, datum, from, to) =>
  test(naam, { titel: "", tekst, datum: datum + "T09:00:00.000Z" }, from, to, from === null ? "gesloten" : "open");

// Hemelvaart valt in 2026 op donderdag 14 mei; in 2027 op 6 mei.
opendag("O1. uitzonderlijk open op een feestdag",
  "Uitzonderlijk open op donderdag 14 mei.", "2026-05-01", "2026-05-14", "2026-05-14");

// Dezelfde zin, maar met de berichtdatum uit de opdracht: 14 mei 2027 is geen
// feestdag (Hemelvaart valt dat jaar op 6 mei), dus komt er geen voorstel.
opendag("O2. open op een dag die dat jaar geen feestdag is",
  "Uitzonderlijk open op donderdag 14 mei.", "2027-05-01", null);

opendag("O3. gewoon open op 1 mei",
  "Op 1 mei zijn wij gewoon open.", "2027-04-20", "2027-05-01", "2027-05-01");

opendag("O4. open op een gewone dag raakt geen feestdag",
  "Wij zijn open op maandag 4 mei.", "2027-04-20", null);

opendag("O5. gesloten en open in één zin",
  "Gesloten op 1 mei, open op 2 mei.", "2027-04-20", null);

test("O6. een sluiting blijft een sluiting",
  { titel: "", tekst: "Wij zijn gesloten van 11 tot en met 15 november.", datum: "2026-11-07T09:00:00.000Z" },
  "2026-11-11", "2026-11-15");

opendag("O7. open-bereik langer dan 14 dagen",
  "Wij zijn open van 1 mei tot en met 20 mei.", "2027-04-20", null);

opendag("O8. open-bereik over twee feestdagen",
  "Wij zijn open van 1 mei tot en met 6 mei.", "2027-04-20", "2027-05-01", "2027-05-06");

opendag("O9. openingsuren is geen openingswoord",
  "Onze openingsuren blijven ongewijzigd op 1 mei.", "2027-04-20", null);

const o = sluitingUitBericht({ titel: "", tekst: "Op 1 mei zijn wij gewoon open.", datum: "2027-04-20T09:00:00.000Z" });
if (o && o.reason === "Feest van de Arbeid") {
  goed++;
  console.log('ok    O10. reden van een open-dag is de naam van de feestdag\n      "' + o.reason + '"');
} else {
  fout++;
  console.log('FOUT  O10. reden van een open-dag is de naam van de feestdag\n      gekregen: ' + (o ? '"' + o.reason + '"' : "null"));
}

const fd = feestdagenIn("2026-05-01", "2026-05-31").map((f) => f.iso + " " + f.name).join(" | ");
if (fd === "2026-05-01 Feest van de Arbeid | 2026-05-14 O.L.H. Hemelvaart | 2026-05-25 Pinkstermaandag") {
  goed++;
  console.log("ok    O11. feestdagenIn komt uit dezelfde lijst als de website\n      " + fd);
} else {
  fout++;
  console.log("FOUT  O11. feestdagenIn komt uit dezelfde lijst als de website\n      gekregen: " + fd);
}

// De lezer draait in een Netlify-functie. Sleept ze (via een import) React mee,
// dan belandt React in de functiebundel. Daarom: geen react-import in de lezer
// en ook niet in de feestdagenlijst die ze gebruikt.
const bronnen = ["netlify/functions/lib/sluiting-lezen.mjs", "src/lib/feestdagen.js"]
  .map((f) => new URL("../" + f, import.meta.url))
  .map((u) => readFileSync(u, "utf8"));
if (!bronnen.some((b) => /from\s+["']react["']/.test(b))) {
  goed++;
  console.log("ok    O12. lezer en feestdagenlijst importeren geen react");
} else {
  fout++;
  console.log("FOUT  O12. lezer en feestdagenlijst importeren geen react\n      react zou in de functiebundel belanden");
}

// ---------- Uit het tweede testrapport van Tess (2026-11-10) ----------
// De zinnen staan hier letterlijk zoals zij ze gebruikte.
console.log("\nOntkenning, heropening en rommelredenen\n");

const zin = (naam, tekst, datum, from, to, soort = "gesloten") =>
  test(naam, { titel: "", tekst, datum: datum + "T09:00:00.000Z" }, from, to, soort);

// 1. Ontkenning is een sluitingszin, geen openingszin.
zin("T1. niet open",
  "Op 11 november zijn wij niet open.", "2026-11-07", "2026-11-11", "2026-11-11");
zin("T2. helaas niet geopend",
  "Helaas niet geopend op 11 november.", "2026-11-07", "2026-11-11", "2026-11-11");
zin("T3. open met een kloktijd-bereik",
  "Op 11 november zijn wij open van 9 tot 12 uur.", "2026-11-07", null);
zin("T4. maar tot 12 uur open",
  "Op 11 november zijn wij maar tot 12 uur open.", "2026-11-07", null);
zin("T5. opendeurdag is geen openingsdag",
  "Open dag op 1 mei: kom langs!", "2027-04-20", null);
zin("T6. niet gesloten levert ook niets op",
  "Wij zijn niet gesloten op 11 november.", "2026-11-07", null);

// 2. Sluiting met een heropening in dezelfde zin blijft een sluiting.
zin("T7. terug open op de dag na de sluiting",
  "Wij zijn gesloten van 11 tot en met 15 november en zijn terug open op 16 november.",
  "2026-11-07", "2026-11-11", "2026-11-15");
zin("T8. daarna weer gewoon open, zonder datum",
  "Wij zijn gesloten van 11 tot en met 15 november, daarna zijn wij weer gewoon open.",
  "2026-11-07", "2026-11-11", "2026-11-15");
zin("T9. heropening tussen haakjes",
  "Gesloten van 24 december tot en met 2 januari (open op 3 januari)",
  "2026-12-01", "2026-12-24", "2027-01-02");
zin("T10. open de dag na een sluiting van één dag blijft onzeker",
  "Gesloten op 1 mei, open op 2 mei.", "2027-04-20", null);
zin("T11. zelfde dag gesloten én open",
  "Gesloten op 1 mei, open op 1 mei.", "2027-04-20", null);
zin("T12. heropening midden in de sluiting",
  "Gesloten van 11 tot en met 15 november, terug open op 13 november.", "2026-11-07", null);
zin("T13. twee losse dagen met tegengestelde betekenis",
  "Gesloten op 1 mei en open op 11 november.", "2027-04-20", null);

// 7. "Terug op ..." is de dag dat ze er weer is, niet de dag dat ze sluit.
test("T14. titel: Vakantie! Terug op 3 januari",
  { titel: "Vakantie! Terug op 3 januari", tekst: "", datum: "2026-12-20T09:00:00.000Z" }, null);
test("T15. titel: met verlof, terug op 3 januari",
  { titel: "Wij zijn met verlof. Terug op 3 januari", tekst: "", datum: "2026-12-20T09:00:00.000Z" }, null);

// ---------- Opsommingen (testrapport 3, bevindingen 2 en 3) ----------
// "X en Y" is alleen een periode als de dagen aan elkaar liggen. Anders zijn
// het losse sluitingen; een opsomming mag nooit één lang bereik worden.
console.log("\nOpsommingen van losse dagen\n");

const lijst = (naam, tekst, datum, verwacht) => {
  let uit = [];
  try {
    uit = sluitingenUitBericht({ titel: "", tekst, datum: datum + "T09:00:00.000Z" });
  } catch (e) {
    fout++;
    console.log(`FOUT  ${naam}\n      wierp een fout: ${e.message}`);
    return;
  }
  const kort = uit.map((x) => `${x.soort} ${x.from}..${x.to}`).join(" + ") || "null";
  if (kort === verwacht) {
    goed++;
    console.log(`ok    ${naam}\n      ${kort}`);
  } else {
    fout++;
    console.log(`FOUT  ${naam}\n      verwacht: ${verwacht}\n      gekregen: ${kort}`);
  }
};

lijst("P1. 24 en 31 december zijn twee dagen, geen week",
  "Wij zijn gesloten op 24 en 31 december.", "2026-12-01",
  "gesloten 2026-12-24..2026-12-24 + gesloten 2026-12-31..2026-12-31");
lijst("P2. 1 en 15 mei",
  "Wij zijn gesloten op 1 en 15 mei.", "2027-04-20",
  "gesloten 2027-05-01..2027-05-01 + gesloten 2027-05-15..2027-05-15");
lijst("P3. 2 en 30 november",
  "Wij zijn gesloten op 2 en 30 november.", "2026-10-20",
  "gesloten 2026-11-02..2026-11-02 + gesloten 2026-11-30..2026-11-30");
lijst("P4. 11 en 13 november laat de donderdag open",
  "Wij zijn gesloten op woensdag 11 en vrijdag 13 november.", "2026-11-07",
  "gesloten 2026-11-11..2026-11-11 + gesloten 2026-11-13..2026-11-13");
lijst("P5. 6 mei en 7 mei liggen aan elkaar: één periode",
  "Wij zijn gesloten op donderdag 6 mei en vrijdag 7 mei.", "2027-04-20",
  "gesloten 2027-05-06..2027-05-07");
lijst("P6. 12, 13 en 14 november",
  "Wij zijn gesloten op 12, 13 en 14 november.", "2026-11-07",
  "gesloten 2026-11-12..2026-11-14");
lijst("P7. 12 + 13 november",
  "Wij zijn gesloten op 12 + 13 november.", "2026-11-07",
  "gesloten 2026-11-12..2026-11-13");
lijst("P8. drie dagen met de maand bij elke datum",
  "Gesloten op 24 december, 25 december en 26 december. Terug open op 27 december", "2026-12-01",
  "gesloten 2026-12-24..2026-12-26");
lijst("P9. één datum plus heropening = tot de dag ervoor",
  "Gesloten op 24 december, terug open op 4 januari", "2026-12-01",
  "gesloten 2026-12-24..2027-01-03");
lijst("P10. twee dagen na elkaar blijven één periode",
  "Gesloten op 20 en 21 november.", "2026-11-10",
  "gesloten 2026-11-20..2026-11-21");
lijst("P11. het echte brugbericht blijft één bereik",
  "Wij nemen een brug van woensdag 11 november tot en met zondag 15 november.", "2026-11-07",
  "gesloten 2026-11-11..2026-11-15");
lijst("P12. Black friday blijft niets",
  "De verzorgingsproducten van Ray krijgen een mooie korting in de week van 20-28 november 2026 !", "2026-11-09",
  "null");

// ---------- Klein uit testrapport 3 ----------
console.log("\nKleine lezingen uit het derde rapport\n");

const kl = (naam, titel, tekst, datum, from, to, soort = "gesloten") =>
  test(naam, { titel, tekst, datum: datum + "T09:00:00.000Z" }, from, to, soort);

kl("K1. titel en tekst spreken elkaar tegen",
  "Gesloten op 11 november", "Update: wij zijn toch gewoon open op 11 november.", "2026-11-07", null);
kl("K2. tegenspraak in de andere richting",
  "Wij zijn open op 11 november", "Helaas toch gesloten op 11 november wegens ziekte.", "2026-11-07", null);
kl("K3. titel en tekst zeggen hetzelfde",
  "Apotheek gesloten van 11 tot en met 15 november", "Wij nemen een brug van woensdag 11 november tot en met zondag 15 november.",
  "2026-11-07", "2026-11-11", "2026-11-15");
kl("K4. slecht weer is geen heropening",
  "", "Wegens slecht weer zijn wij gesloten op 12 november.", "2026-11-07", "2026-11-12", "2026-11-12");
kl("K5. punten in O.L.H. knippen de zin niet",
  "", "Op 6 mei (O.L.H. Hemelvaart) zijn wij open.", "2027-04-20", "2027-05-06", "2027-05-06", "open");
kl("K6. de wachtapotheek is een andere apotheek",
  "", "Op 11 november is de wachtapotheek open. Wij zijn gesloten.", "2026-11-07", null);

// ---------- Korte reden (redenUitBericht) ----------
console.log("\nKorte reden voor op de website\n");

const reden = (naam, bericht, wacht) => {
  let uit = null;
  try {
    uit = redenUitBericht(bericht);
  } catch (e) {
    fout++;
    console.log(`FOUT  ${naam}\n      wierp een fout: ${e.message}`);
    return;
  }
  if (uit === wacht) {
    goed++;
    console.log(`ok    ${naam}\n      "${uit}"`);
  } else {
    fout++;
    console.log(`FOUT  ${naam}\n      verwacht: "${wacht}"\n      gekregen: "${uit}"`);
  }
};

reden("R1. verlof", { titel: "Jaarlijks verlof", tekst: "Gesloten van 3/9 tot 20/9." }, "Jaarlijkse vakantie");
reden("R2. vakantie in de tekst", { titel: "Even weg", tekst: "Wij nemen vakantie van 1 tot 8 juli." }, "Jaarlijkse vakantie");
reden("R3. brug", { titel: "Apotheek gesloten van 11 tot en met 15 november", tekst: "Wij nemen een brug van woensdag 11 november tot en met zondag 15 november." }, "Brugdagen");
reden("R4. opleiding", { titel: "Gesloten op 3 maart", tekst: "Wij volgen een opleiding over antistolling." }, "Opleiding");
reden("R5. bijscholing", { titel: "", tekst: "Gesloten wegens bijscholing op 3 maart." }, "Opleiding");
reden("R6. feestdag bij naam", { titel: "Gesloten op 11 november", tekst: "Wapenstilstand." }, "Wapenstilstand");
reden("R7. titel zonder datumgedeelte", { titel: "Apotheek gesloten wegens ziekte op 12 december", tekst: "" }, "Wegens ziekte");
reden("R8. titel die alleen een datumzin is", { titel: "Apotheek gesloten van 11 tot en met 15 november", tekst: "" }, "Gesloten");
reden("R9. niets bruikbaars", { titel: "", tekst: "Gesloten van 1 tot 3 december." }, "Gesloten");
reden("R10. eigen titel blijft staan", { titel: "Kerstsluiting", tekst: "Gesloten van 24 december tot en met 2 januari." }, "Kerstsluiting");

reden("R13. punten uit t.e.m. komen niet in de reden", { titel: "Wij zijn gesloten van 1 dec. t.e.m. 3 dec.", tekst: "" }, "Gesloten");
reden("R14. heropeningswoord is geen reden", { titel: "Gesloten. Terug op 3 januari.", tekst: "" }, "Gesloten");
reden("R15. brokstuk uit een andere zin in de titel", { titel: "Wij zijn gesloten op zondag; de actie loopt van 21 tot en met 29 november.", tekst: "" }, "Gesloten");

const lang = redenUitBericht({
  titel: "Belangrijk nieuws voor al onze klanten uit Pervijze en omstreken over de komende weken",
  tekst: "Gesloten van 1 tot 3 december.",
});
if (lang.length <= 40) {
  goed++;
  console.log(`ok    R11. lange titel afgekapt op 40 tekens\n      "${lang}" (${lang.length})`);
} else {
  fout++;
  console.log(`FOUT  R11. lange titel afgekapt op 40 tekens\n      gekregen: "${lang}" (${lang.length})`);
}

const z = sluitingUitBericht({ titel: "", tekst: "Gesloten van 3/9 tot 20/9.", datum: "2026-08-20T09:00:00.000Z" });
if (z && z.reason === "Gesloten") {
  goed++;
  console.log(`ok    R12. sluitingUitBericht gebruikt dezelfde korte reden`);
} else {
  fout++;
  console.log(`FOUT  R12. sluitingUitBericht gebruikt dezelfde korte reden\n      gekregen: ${z ? `"${z.reason}"` : "null"}`);
}

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
