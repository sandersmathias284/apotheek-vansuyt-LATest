// Tess: wat zet de automatische laag vanzelf op de site? Nagemaakte store, zelfde code als productie.
// Overgenomen uit Tess' testrapport 4 (test/voorstellen4/corpus-automatisch.mjs),
// zodat een volgende wijziging niet stilletjes opnieuw een promotie of een
// zin over iemand anders op de publieke site kan zetten.
import { verwerkBerichten } from "../netlify/functions/lib/sluitingen.mjs";

const maakStore = (begin = {}) => {
  const data = new Map(Object.entries(begin));
  return {
    data,
    async get(k) { return data.has(k) ? JSON.parse(JSON.stringify(data.get(k))) : null; },
    async setJSON(k, v) { data.set(k, JSON.parse(JSON.stringify(v))); },
  };
};
const NU = new Date("2026-11-11T10:00:00");
const G = (a, b) => `gesloten:${a}..${b || a}`;
const O = (a, b) => `open:${a}..${b || a}`;

// [naam, titel, tekst, goedeUitkomsten (wat vanzelf mag), datum]
const C = [];
const add = (groep, titel, tekst, ok = [], datum = "2026-11-10") => C.push({ groep, titel, tekst, ok, datum });

// ---- A. opsommingen
add("A opsomming", "", "Wij zijn gesloten op 24 en 31 december.");
add("A opsomming", "", "Wij zijn gesloten op 1 en 15 mei.");
add("A opsomming", "", "Wij zijn gesloten op woensdag 11 en vrijdag 13 november.");
add("A opsomming", "", "Wij zijn gesloten op donderdag 6 mei en vrijdag 7 mei.", [G("2027-05-06", "2027-05-07")], "2027-04-20");
add("A opsomming", "", "Wij zijn gesloten op 12, 13 en 14 november.", [G("2026-11-12", "2026-11-14")]);
add("A opsomming", "", "Wij zijn gesloten op 12 + 13 november.", [G("2026-11-12", "2026-11-13")]);
add("A opsomming", "", "Gesloten op 24 december, 25 december en 26 december. Terug open op 27 december.", [G("2026-12-24", "2026-12-26")]);
add("A opsomming", "", "Gesloten op 24 december, terug open op 4 januari.", [G("2026-12-24", "2027-01-03")]);
add("A opsomming", "", "Wij zijn gesloten op 11, 12 en 15 november.");
add("A opsomming", "", "Wij zijn gesloten op 24/12 en 31/12.");
add("A opsomming", "", "Wij zijn gesloten op 24-12 en 31-12.");
add("A opsomming", "", "Wij zijn gesloten op 24 dec en 31 dec.");
add("A opsomming", "", "Wij zijn gesloten op 24 december en op 31 december.");
add("A opsomming", "", "Wij zijn gesloten op 12 november (donderdag) en 13 november (vrijdag).", [G("2026-11-12", "2026-11-13")]);
add("A opsomming", "", "Wij zijn gesloten op 12 november en ook op 13 november.", [G("2026-11-12", "2026-11-13")]);
add("A opsomming", "", "Wij zijn gesloten op 12 november alsook 13 november.", [G("2026-11-12", "2026-11-13")]);
add("A opsomming", "", "Wij zijn gesloten op 12 november, evenals op 13 november.", [G("2026-11-12", "2026-11-13")]);
add("A opsomming", "", "Wij zijn gesloten op 24 december en eveneens op 31 december.");
add("A opsomming", "", "Wij zijn gesloten op 24 december of 31 december.");
add("A opsomming", "", "Wij zijn gesloten op 24 december/31 december.");
add("A opsomming", "", "Wij zijn gesloten op 24 december & 31 december.");
add("A opsomming", "", "Wij zijn gesloten op 24 december en 31 december 2026.");
add("A opsomming", "", "Gesloten op 12 november. Ook op 13 november zijn wij gesloten.", [G("2026-11-12", "2026-11-13")]);
add("A opsomming", "", "Gesloten op 12 november. Wij zijn ook gesloten op 24 december.");
add("A meerdere zinnen", "", "Wij zijn gesloten op 12 november. Op 25 december zijn wij ook dicht.");
add("A meerdere zinnen", "", "Wij zijn gesloten van 11 tot en met 15 november en van 24 december tot en met 2 januari.");
add("A meerdere zinnen", "", "Wij zijn gesloten van 11 tot en met 13 november. Van 24 tot en met 26 december zijn wij ook gesloten.");
add("A meerdere zinnen", "Vakantiesluiting", "Zomersluiting: wij zijn gesloten van 5 tot en met 9 juli. Ook van 19 tot 23 juli zijn we dicht.");
add("A meerdere zinnen", "", "Wij zijn gesloten van 11 tot en met 15 november en op 24 december.");
add("A meerdere zinnen", "", "Wij zijn gesloten op 12 november en gesloten op 13 november.", [G("2026-11-12", "2026-11-13")]);

// ---- B. ontkenning en spiegelvormen
const B = [
  "Wij sluiten niet op 11 november.", "Op 11 november sluiten wij niet.", "Geen sluiting op 11 november.",
  "Op 11 november is er geen vakantie.", "Wij nemen geen verlof op 11 november.", "Geen brugdag op 13 november.",
  "Dit jaar sluiten wij niet voor Wapenstilstand op 11 november.", "Wij zijn niet met vakantie op 11 november.",
  "Wij zijn open van 9 tot 13 november, niet open op 11 november.", "Open van 11 tot 15 november, behalve op 13 november (niet open).",
  "Op 11 november zijn we open, maar op 12 november niet open.", "Op 11 november zijn wij niet gesloten.",
  "Wij zijn op 11 november allerminst gesloten.", "Er is geen sprake van een sluiting van 11 tot en met 15 november.",
  "Er zijn geen plannen om te sluiten van 11 tot en met 15 november.", "Van 11 tot en met 15 november zijn wij niet verplicht om gesloten te zijn.",
  "Wij blijven open op 11 november, gesloten zijn we niet.", "Gelukkig geen sluiting van 11 tot en met 15 november.",
  "Wij sluiten helemaal niet van 11 tot en met 15 november.", "Zonder sluiting door de feestdagen: wij zijn open van 24 december tot 2 januari.",
  "Het gerucht dat wij gesloten zijn op 11 november klopt niet.", "Wij zijn op 11 november gewoon open, we zijn dus niet gesloten.",
  "Nee, wij zijn op 11 november niet dicht.", "Wij zijn op 11 november zeker niet gesloten.",
  "Wij hoeven op 11 november niet te sluiten.", "Wij zijn van 11 tot en met 15 november ononderbroken geopend, nooit gesloten.",
  "Wie denkt dat wij op 11 november gesloten zijn, vergist zich.", "Of wij op 11 november gesloten zijn? Neen, helemaal niet.",
];
B.forEach((t) => add("B negatie", "", t));
add("B negatie", "", "Wij zijn niet open van 11 tot en met 15 november.", [G("2026-11-11", "2026-11-15")]);
add("B negatie", "", "Wij blijven open op 11 november.", [O("2026-11-11")]);

// ---- C. heropeningstaal
const Cc = [
  "Na de vakantie zijn wij op 4 januari terug open.", "Op 4 januari zijn wij terug open na de vakantie.",
  "Op 11 november zijn we opnieuw open na de vakantie.", "Van 9 tot en met 13 november zijn wij weer open na onze vakantie.",
  "Terug open op 4 januari.", "De apotheek is vanaf maandag 16 november weer open na de verbouwing.",
  "Wij zijn gesloten tot en met 15 november, terug open op 16 november.", "Na 3 weken vakantie zijn wij terug open op 4 januari.",
  "Vakantie: tot 3 januari. Terug op 4 januari.", "Wij zijn weer open vanaf 4 januari na de kerstvakantie.",
  "Open vanaf 4 januari, na onze vakantie.", "Ons verlof is voorbij, op 4 januari zijn wij er weer.",
  "Op 4 januari zijn we terug na een rustige vakantie.",
];
Cc.forEach((t) => add("C heropening", "", t, [], "2026-12-01"));
add("C heropening", "", "Gesloten van 11 tot en met 15 november en terug open op 16 november.", [G("2026-11-11", "2026-11-15")]);
add("C heropening", "", "Gesloten van 24 december tot en met 2 januari. Open vanaf 3 januari.", [G("2026-12-24", "2027-01-02")], "2026-12-01");
add("C heropening", "Vakantie! Terug op 3 januari", "", [], "2026-12-01");
add("C heropening", "Wij zijn met verlof. Terug op 3 januari", "", [], "2026-12-01");
add("C heropening", "Gesloten. Terug open op 3 januari", "", [], "2026-12-01");

// ---- D. titel contra tekst, en tegenspraak binnen een tekst
add("D tegenspraak", "Gesloten op 11 november", "Update: wij zijn toch gewoon open op 11 november.");
add("D tegenspraak", "Wij zijn open op 11 november", "Helaas toch gesloten op 11 november wegens ziekte.");
add("D tegenspraak", "Gesloten van 11 tot en met 15 november", "Update: wij zijn toch open op donderdag 12 november.");
add("D tegenspraak", "Gesloten van 11 tot en met 15 november", "Update: wegens de goede evolutie zijn wij al op 13 november terug open.");
add("D tegenspraak", "Gesloten van 11 tot en met 15 november", "Update: de sluiting wordt verlengd tot en met 18 november.");
add("D tegenspraak", "Gesloten van 11 tot en met 15 november", "Update: de sluiting is geannuleerd, wij zijn gewoon open.");
add("D tegenspraak", "Gesloten van 11 tot en met 15 november", "Gelukkig kunnen wij toch heropenen op 13 november.");
add("D tegenspraak", "", "Wij zijn gesloten van 11 tot en met 15 november. Op 13 november zijn we toch open.");
add("D tegenspraak", "", "Op 13 november zijn we open. Wij zijn gesloten van 11 tot en met 15 november.");
add("D tegenspraak", "Gesloten van 11 tot en met 15 november", "Op vrijdag 13 november zijn wij wel open voor dringende zaken.");
add("D tegenspraak", "Gesloten op 12 november", "Voor dringende zaken zijn wij wel open op 12 november van 10 tot 11 uur.");
add("D tegenspraak", "Brugdagen", "Wij zijn gesloten op vrijdag 13 november. Maandag 16 november is de apotheek weer open.", [G("2026-11-13")]);
add("D tegenspraak", "Wij sluiten niet op 11 november", "Wij zijn gesloten op 11 november.");
add("D tegenspraak", "Verlof van 11 tot en met 15 november", "Verlof van 11 tot en met 15 november is geschrapt, wij zijn open.");

// ---- E. deeldag
const E = [
  "Op 13 november zijn wij 's namiddags gesloten.", "Op 13 november zijn wij in de namiddag gesloten wegens opleiding.",
  "Wij zijn op 13 november gesloten vanaf 12 uur.", "Wij zijn op 13 november gesloten van 12 tot 14 uur.",
  "Wij zijn op 13 november gesloten van 12u tot 14u.", "Op 13 november zijn wij tussen de middag gesloten.",
  "Op 13 november zijn wij gesloten na de middag.", "Op 13 november zijn we vanaf 14u gesloten.",
  "Op 13 november sluiten wij om vijf uur.", "Op vrijdag 13 november zijn wij gesloten vanaf twaalf uur.",
  "Op 13 november zijn wij een uurtje gesloten.", "Op 13 november zijn wij tijdens de lunch gesloten.",
  "Op 13 november sluiten wij om half vijf.", "Op 13 november zijn we gesloten tot half twee.",
  "Wij zijn gesloten op 13 november tussen 12 en 14.", "Op 13 november sluiten we vroeger.",
  "Op 13 november zijn wij tot 10 uur gesloten.", "Op 13 november zijn wij 's avonds dicht.",
  "Op 13 november zijn wij enkele uren gesloten wegens een stroompanne.", "Op 13 november zijn wij een halve dag gesloten.",
  "Op 13 november zijn we de hele ochtend dicht.", "Wij zijn op 13 november tijdelijk gesloten wegens een stroompanne.",
  "Vrijdag 13 november zijn wij vroeger dicht.", "Vanaf 13 november 14u zijn wij gesloten.",
  "Op 13 november zijn wij kort gesloten omdat de dokter langskomt.", "Op 13 november zijn wij de voormiddag gesloten.",
  "Wij sluiten op 13 november al om 16 uur.", "Wij zijn op 13 november tot 9.30 gesloten.",
  "Op 13 november is de apotheek tot de middag gesloten.", "Op 13 november zijn we pas om negen uur open, daarvoor dicht.",
];
E.forEach((t) => add("E deeldag", "", t));
add("E deeldag", "", "Op 11 november zijn wij open van 9:00 tot 12:00.");
add("E deeldag", "", "Op 11 november zijn wij open van 9.00 tot 12.00 uur.");
add("E deeldag", "", "Op 11 november zijn we open tot de middag.");
add("E deeldag", "", "Op 11 november zijn we enkel open in de voormiddag.");
add("E deeldag", "", "Op 11 november zijn wij open van negen tot twaalf.");
add("E deeldag", "", "Op 11 november zijn wij open van 9 tot 12 uur.");
add("E deeldag", "", "Op 11 november zijn wij open van negen uur tot twaalf uur.");
add("E deeldag", "", "Op 11 november zijn wij beperkt open.");
add("E deeldag", "", "Op 11 november zijn wij maar een paar uur open.");

// ---- F. andermans sluiting, reclame, woorden die toevallig sluiten betekenen
const F = [
  "De huisarts is met verlof van 11 tot en met 15 november, voor dringende zaken kunt u bij ons terecht.",
  "Dokter Peeters is met vakantie van 11 tot en met 15 november.",
  "Onze leverancier is gesloten van 11 tot en met 15 november, leveringen kunnen vertragen.",
  "Het gemeentehuis is dicht op 11 november.",
  "De school is gesloten op 11 november, vergeet de kindjes niet af te halen bij ons voor een snoepje.",
  "Vakantieperiode: wij verwachten drukte van 21 tot en met 24 december.",
  "Vakantie-actie: zonnecrème aan -20% van 12 tot en met 18 november.",
  "Reisadvies en vakantievaccinaties: elke dag van 12 tot en met 14 november.",
  "Griepvaccinatie: dicht bij u, elke dag van 12 tot en met 14 november.",
  "De inschrijvingen voor de griepvaccinatie sluiten op 20 november.",
  "Inschrijven kan tot de sluiting van de actie op 20 november.",
  "Voor de brug van 11 november kunt u nog tot 10 november bestellen.",
  "Het verlof van onze stagiair eindigt op 11 november, wij verwelkomen haar terug.",
  "De wachtapotheek is gesloten op 11 november.",
  "Het inschrijvingsloket voor de griepprik is open van 9 tot en met 13 november.",
  "Op 11 november openen wij onze nieuwe webshop.",
  "Open huis op 11 november, kom langs voor een gratis bloeddruk.",
  "Onze online bestelling is open van 9 tot 13 november.",
  "Vanaf 11 november is ons nieuwe loket open.",
  "De parking naast de apotheek is gesloten van 11 tot en met 15 november wegens werken.",
  "De Colruyt is gesloten op 11 november.",
  "Brug tussen Wapenstilstand en het weekend: bestel uw medicatie voor 10 november.",
  "Wegens de brug van Hemelvaart is de bpost gesloten op 7 mei, pakjes liggen klaar vanaf 8 mei.",
  "Verlofdagen van het personeel: de bestellingen worden verwerkt van 11 tot en met 15 november.",
  "Brugpensioen? Infosessie op 12 november.",
];
F.forEach((t) => add("F niet over ons", "", t));
add("F niet over ons", "", "Op 1 mei openen wij onze nieuwe webshop.", [], "2027-04-20");
add("F niet over ons", "", "Ons nieuwe vaccinatiecentrum is open op 6 mei.", [], "2027-04-20");

// ---- G. datums, jaar, weekdag
add("G datum", "", "Bedankt voor uw begrip tijdens onze sluiting van 1 tot en met 5 oktober.", [], "2026-11-15");
add("G datum", "", "Vorig jaar waren wij gesloten van 24 december tot en met 2 januari.", [], "2026-11-10");
add("G datum", "", "Wij zijn gesloten op woensdag 12 november.");
add("G datum", "", "Wij zijn gesloten op vrijdag 12 november.");
add("G datum", "", "Wij zijn gesloten van maandag 11 tot en met vrijdag 15 november.");
add("G datum", "", "Wij zijn gesloten van woensdag 11 tot en met zondag 15 november.", [G("2026-11-11", "2026-11-15")]);
add("G datum", "", "Wij zijn gesloten op 11 november 2036.");
add("G datum", "", "Wij zijn gesloten op 11 november 2025.");
add("G datum", "", "Wij zijn gesloten van 11 tot en met 15 november 2026.", [G("2026-11-11", "2026-11-15")]);
add("G datum", "", "Wij zijn gesloten van 15 tot 11 november.");
add("G datum", "", "Wij zijn gesloten van 11 tot en met 15 oktober.", [], "2026-11-10");
add("G datum", "", "Wij zijn gesloten van 31 oktober tot 12 november.", [G("2026-10-31", "2026-11-12")]);
add("G datum", "", "Uitzonderlijk gesloten op dinsdag 3 maart.", [G("2027-03-03")], "2027-02-25");
add("G datum", "", "Wij zijn gesloten op 31 februari.");
add("G datum", "", "Wij zijn gesloten van 1 tot 60 november.");
add("G datum", "", "Wij zijn gesloten van 11 november tot en met 15 november.", [G("2026-11-11", "2026-11-15")]);
add("G datum", "", "Wij zijn gesloten van 11/11 tot 15/11.", [G("2026-11-11", "2026-11-15")]);
add("G datum", "", "Wij zijn gesloten van 11.11 tot 15.11.", [G("2026-11-11", "2026-11-15")]);
add("G datum", "", "Wij zijn gesloten van 11 tem 15 nov.", [G("2026-11-11", "2026-11-15")]);
add("G datum", "", "Wij zijn gesloten van 11 t/m 15 november.", [G("2026-11-11", "2026-11-15")]);
add("G datum", "", "Wij zijn gesloten van 11 tot en met 15 november en 20 november.", [G("2026-11-11", "2026-11-15")]);
add("G datum", "", "Wij zijn gesloten in de week van 16 tot 20 november.", [G("2026-11-16", "2026-11-20")]);
add("G datum", "", "Wij zijn gesloten in de week van 16 november.");
add("G datum", "", "Wij zijn gesloten van 16 november tot het einde van de maand.");
add("G datum", "", "Wij zijn gesloten tot 20 november.");
add("G datum", "", "Wij zijn gesloten vanaf 20 november.");
add("G datum", "", "Wij zijn gesloten vanaf 20 november tot nader order.");
add("G datum", "", "Wij zijn gesloten tijdens de kerstvakantie.");
add("G datum", "", "Wij zijn gesloten van 1 januari tot 31 december.");
add("G datum", "", "Wij zijn gesloten van 1 oktober tot 31 december.");
add("G datum", "", "Wij zijn gesloten van 1 december tot 29 januari.", [G("2026-12-01", "2027-01-29")]);
add("G datum", "", "Wij zijn gesloten van 3 maart tot 5 maart.", [G("2027-03-03", "2027-03-05")]);
add("G datum", "", "Wij zijn gesloten op 29 februari.", [], "2027-01-01");
add("G datum", "", "Wij zijn gesloten op 11 november 11 uur.");
add("G datum", "", "Gesloten op 1 mei.", [G("2027-05-01")]);
add("G datum", "", "Gesloten op 15 augustus.", [G("2027-08-15")]);

// ---- H. reden (publiek zonder controle) -> hier bekijken we de reden, niet de datum
add("H reden", "", "Wij zijn gesloten op 12 november. Prettige vakantie aan al onze klanten!", [G("2026-11-12")]);
add("H reden", "", "Wij zijn gesloten op 12 november wegens ziekte. Hopelijk tot na de vakantie.", [G("2026-11-12")]);
add("H reden", "", "Wij zijn gesloten op 12 november. Het team wenst u een gelukkig nieuwjaar.", [G("2026-11-12")]);
add("H reden", "Gesloten op 12 november wegens begrafenis van mevrouw Janssens", "", [G("2026-11-12")]);
add("H reden", "Gesloten op 12 november wegens overlijden van onze zaakvoerder", "", [G("2026-11-12")]);
add("H reden", "Gesloten op 12 november wegens ziekenhuisopname van Els", "", [G("2026-11-12")]);
add("H reden", "Gesloten op 12 november: bel 0471 12 34 56 voor spoed", "", [G("2026-11-12")]);
add("H reden", "Gesloten op 12 november", "Wij zijn gesloten op 12 november. Wij sluiten de brug naar de vakantie.", [G("2026-11-12")]);
add("H reden", "Wij zijn gesloten op 12 november", "Gesloten omdat de kerstmis-versiering wordt opgehangen.", [G("2026-11-12")]);
add("H reden", "Gesloten op 12 november wegens bezoek van de FAGG-inspectie en een gebroken pols", "", [G("2026-11-12")]);

// ---- I. reeds-eigen sluiting
const eigen = (from, to, id = "eigen1") => ({ id, from, to, reason: "Eigen", note: "" });

const uitKort = (m) => `${m.soort}:${m.from}..${m.to}`;
const run = async (c, voorraad = {}) => {
  const store = maakStore(voorraad);
  const b = [{ id: "b1", titel: c.titel, tekst: c.tekst, datum: `${c.datum}T09:00:00.000Z` }];
  const uit = await verwerkBerichten(store, b, { nu: NU });
  return { toegepast: uit.toegepast, lijst: uit.lijst, closures: uit.closures, feestdagOpen: uit.feestdagOpen };
};

const argv = process.argv.slice(2);
const toon = argv.includes("--alles");
let teller = 0, fouten = 0;
for (const c of C) {
  teller++;
  const r = await run(c);
  const toegepast = r.toegepast.map(uitKort);
  const voorstel = r.lijst.filter((v) => !v.toegepast).map(uitKort);
  const fout = toegepast.filter((t) => !c.ok.includes(t));
  const mis = c.ok.filter((t) => !toegepast.includes(t));
  const tekst = (c.titel ? `[${c.titel}] ` : "") + c.tekst;
  const redenen = r.toegepast.map((m) => m.reason).join(" / ");
  if (fout.length) {
    fouten++;
    console.log(`AUTO-FOUT [${c.groep}] ${tekst}\n     -> vanzelf op de site: ${toegepast.join(", ")}  (reden "${redenen}")  mag: ${c.ok.join(", ") || "niets"}${voorstel.length ? "  | voorstel: " + voorstel.join(", ") : ""}`);
  } else if (toon || mis.length) {
    console.log(`${mis.length ? "MIS    " : "ok     "}[${c.groep}] ${tekst}\n     -> vanzelf: ${toegepast.join(", ") || "-"}${redenen ? ` (reden "${redenen}")` : ""}  voorstel: ${voorstel.join(", ") || "-"}`);
  }
}
console.log(`\n${teller} zinnen, ${fouten} met iets dat vanzelf op de site kwam en niet mocht.`);
process.exit(fouten ? 1 : 0);
