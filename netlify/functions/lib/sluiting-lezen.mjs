// Leest uit een nieuwsbericht of de apotheek op bepaalde dagen dicht of juist
// open is.
//
// sluitingUitBericht({ titel, tekst, datum }) geeft
// { soort: "gesloten" | "open", from, to, reason } of null. Geen Netlify-import,
// zodat ze met node te testen is:   node tools/test-sluiting-lezen.mjs
//
// Wat hier uitkomt is altijd een VOORSTEL voor de apotheker in /beheer/, nooit
// een sluiting op de website: een foute lezing zou de apotheek sluiten terwijl
// ze open is. De bescherming daartegen is de regel dat een zin alleen meetelt
// als er een sluitings- of openingswoord in staat — in dezelfde zin als de
// datums. Zo levert "korting in de week van 20-28 november" niets op.
//
// De feestdagenlijst komt uit src/lib/feestdagen.js, dezelfde lijst die de
// website gebruikt. Geen tweede lijst, zodat ze niet uit elkaar kunnen lopen.
// Dat bestand importeert bewust geen React, zodat React niet in de
// functiebundel belandt.
import { holidaysOf } from "../../../src/lib/feestdagen.js";

const MAANDEN = {
  januari: 1, jan: 1,
  februari: 2, feb: 2,
  maart: 3, mrt: 3,
  april: 4, apr: 4,
  mei: 5,
  juni: 6, jun: 6,
  juli: 7, jul: 7,
  augustus: 8, aug: 8,
  september: 9, sept: 9, sep: 9,
  oktober: 10, okt: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};
// Langste namen eerst, anders knipt "jan" al in "januari".
const MAAND = Object.keys(MAANDEN).sort((a, b) => b.length - a.length).join("|");

// De hele bescherming tegen valse treffers: zonder zo'n woord in dezelfde zin
// wordt er niets gelezen. "dicht" blijft een heel woord, anders telt "dichtbij".
// "vakantie-actie", "vakantievaccinaties", "verlofdagen van het personeel",
// "brugpensioen" en "dicht bij u" gaan niet over onze deur. Daarom geen
// \w* meer achter de woorden: een samenstelling is iets anders dan het woord.
const SLUITWOORD = /\b(?:gesloten|sluiting(?:en)?|sluiten|sluit|verlof|vakantie|vakanties|brug|brugdag(?:en)?|dicht)(?![-\w])(?!\s*bij)/;
// Het bericht gaat vóór de feestdagenlijst, dus ook "wij zijn die dag gewoon
// open" moet gelezen worden. "open" blijft een heel woord: "openingsuren" telt
// niet mee. "gewoon open", "uitzonderlijk open" en "wel open" vallen er vanzelf
// onder, want het woord "open" staat erin.
const OPENWOORD = /\b(?:open|geopend|openen)\b/;
// "niet open", "helaas niet geopend", "nooit open": dat is een sluitingszin.
// Zonder deze regel leest "op 11 november zijn wij niet open" als een open-dag,
// precies het omgekeerde van wat er staat.
const NIET = "(?:niet|nooit|geen)";
const OPEN_KERN = "(?:open|geopend|openen)";
const SLUIT_KERN = "(?:gesloten|sluiting\\w*|sluiten|sluit|verlof\\w*|vakantie\\w*|brug\\w*|dicht)";
const NIET_OPEN = new RegExp(`\\b${NIET}\\b(?:\\s+\\w+){0,2}\\s+${OPEN_KERN}\\b`, "g");
// Staat er ergens in de zin een ontkenning die bij het sluitingswoord hoort,
// hoe ver ook ("Er is geen sprake van een sluiting van 11 tot en met 15
// november"), dan lezen we niets. Nooit het omgekeerde van wat er staat.
const NIET_VER = /\b(?:niet|nooit|geen|allerminst|zonder|neen|nee)\b/;
// Het spiegelbeeld: "geen sluiting", "wij sluiten niet", "niet met vakantie".
// Daar maken we niets van — een omgekeerde lezing is erger dan geen voorstel.
// Het ontkennende woord kan er vóór of ná staan.
const NIET_DICHT = new RegExp(
  `\\b${NIET}\\b(?:\\s+\\w+){0,2}\\s+${SLUIT_KERN}\\b|\\b${SLUIT_KERN}\\b(?:\\s+\\w+){0,2}\\s+${NIET}\\b`,
);
// Een opendeurdag is geen openingsuur.
const OPEN_DAG = /\bopen\s*deur\w*|\bopen\s*dag(?:en)?\b|\bopen\s*huis\b/g;
// "open van 9 tot 12 uur", "tot 12 uur open": dat gaat over uren, niet over
// dagen. Zo'n zin levert geen open-dag op.
const UURZIN = /\b\d{1,2}(?:[.:u]\d{2})?\s*(?:uur|u)\b|\bom\s+\d{1,2}\b/;
// Heropeningstaal. "Gesloten van 11 tot en met 15 november en terug open op 16
// november" blijft daardoor een sluiting, en "Vakantie! Terug op 3 januari"
// levert niets op in plaats van een sluiting op de dag dat ze terug is.
// Heropeningstaal: de datum hoort dan bij de dag dat ze er wéér is, niet bij
// de dag dat ze sluit. Naast "terug/weer ... open" ook de naamwoorden en de
// vormen zonder "open": heropening, heropenen, einde sluiting, terug van
// vakantie, er weer zijn, weer bereikbaar.
const HEROPENING = new RegExp([
  "\\b(?:terug|opnieuw|weer|daarna|nadien|nadat)\\b(?=[^.]{0,30}\\bopen)",
  "\\bterug\\s+op\\b",
  "\\bheropen\\w*",
  "\\beinde\\s+(?:van\\s+)?(?:de\\s+)?(?:sluiting|verlof|vakantie)",
  "\\bsluiting\\s+eindigt",
  "\\b(?:verlof|vakantie|sluiting)\\s+is\\s+(?:voorbij|gedaan|afgelopen)",
  "\\bterug\\s+(?:van|uit)\\s+(?:vakantie|verlof)",
  "\\b(?:er|terug)\\s+weer\\b",
  "\\bweer\\s+(?:bereikbaar|voor\\s+u)",
  "\\bzijn\\s+(?:wij|we)\\s+(?:er\\s+)?terug\\b",
  "\\bstaan\\s+(?:wij|we)\\s+(?:weer|opnieuw)",
].join("|"));
// Iemand of iets anders dat open of dicht kan zijn. Staat dat in de zin, dan
// gaat de zin niet (alleen) over onze deur en lezen we niets.
const IEMAND_ANDERS = new RegExp("\\b(?:" + [
  "wachtapotheek", "wachtdienst", "apotheek van wacht",
  "huisarts", "dokter", "arts", "tandarts", "ziekenhuis",
  "leverancier", "groothandel", "school", "scholen", "gemeentehuis", "gemeente",
  "parking", "colruyt", "delhaize", "winkel", "bakker", "beenhouwer",
  "bpost", "post", "bank", "stagiair\\w*", "personeel",
  "loket", "webshop", "website", "vaccinatiecentrum", "infosessie",
  "inschrijving\\w*", "inschrijven", "actie", "promotie", "korting",
  "bestelling\\w*", "levering\\w*", "pakje\\w*",
].join("|") + ")\\b");

// Een zin die een gerucht navertelt of weerlegt, kondigt niets aan.
const GERUCHT = /\b(?:vergist|vergissing|gerucht\w*|zogezegd|zogenaamd)\b|\bklopt\s+niet\b|\bdenkt\s+dat\b/;

// Weekdagnamen worden weggelaten, niet gebruikt om te rekenen.
const WEEKDAGEN = /\b(?:maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)s?\b/g;
const TOT = "(?:tot en met|t/m|tem|tot)";
// Een dag mag niet midden in een ander getal of in "20-28" beginnen.
const START = "(?<![\\d/-])";

// van 3/9 tot 20/9  ·  van 24-12 tot 2-1  ·  met of zonder jaartal
const RE_CIJFERS = new RegExp(
  `van(?:af)?\\s+${START}(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{2,4}))?\\s+${TOT}\\s+(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{2,4}))?`,
);
// van 11 tot en met 15 november  ·  van 24 december tot en met 2 januari
// De tweede datum moet een maand hebben; de eerste mag ze lenen.
const RE_WOORDEN = new RegExp(
  `van(?:af)?\\s+${START}(\\d{1,2})(?:\\s+(${MAAND})\\.?)?(?:\\s+(\\d{4}))?\\s+${TOT}\\s+(\\d{1,2})\\s+(${MAAND})\\.?(?:\\s+(\\d{4}))?`,
);
// Een opsomming: "24 en 31 december", "12, 13 en 14 november", "6 mei en
// 7 mei", "12 + 13 november". Welke dagen dat zijn, wordt hieronder uit de
// gevonden tekst gehaald; aaneensluitende dagen worden één periode, de rest
// blijft apart. "X en Y" is dus géén bereik meer op zich.
const RE_OPSOMMING = new RegExp(
  `(?:op\\s+)?${START}\\d{1,2}(?:\\s+(?:${MAAND})\\.?)?(?:\\s*(?:,|\\+|&|en ook|en|alsook|evenals|eveneens|ook)\\s*(?:op\\s+)?\\d{1,2}(?:\\s+(?:${MAAND})\\.?)?)+(?:\\s+\\d{4})?`,
);
const RE_TOKEN = new RegExp(`(?<!\\d)(\\d{1,2})(?!\\d)(?:\\s+(${MAAND})\\.?)?`, "g");
// op 11 november  ·  11 november 2026
const RE_EEN_WOORD = new RegExp(`(?:op\\s+)?${START}(\\d{1,2})\\s+(${MAAND})\\.?(?:\\s+(\\d{4}))?`);
// op 24/12 — alleen met "op" ervoor, anders leest ze te veel mee.
const RE_EEN_CIJFER = new RegExp(`op\\s+${START}(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{2,4}))?(?!\\d)`);

// "van 12 tot 13 uur" is geen sluitingsperiode.
const UREN = /^\s*(?:uur|u\b|h\b)/;
// Een losse datum die aan "tot", "t/m", "vanaf" of "van" hangt is een half
// bereik: het andere einde zou een gok zijn, en een gok is erger dan niets.
const HALF = /\b(?:tot en met|tot|t\/m|tem|vanaf|van|voor|tegen|sinds|na)\s+$/;
// Een zin die over een stuk van de dag gaat, levert niets op: dit model kent
// alleen hele dagen, dus er valt niets eerlijks te schrijven.
// "om 17u", "9:00", "van 12u tot 14u", "tot 12h".
const KLOKTIJD = /\bom\s+\d{1,2}\b|\b\d{1,2}\s*(?:uur|u|h)\b|\b\d{1,2}[.:u]\d{2}\b/;
// "'s namiddags", "in de voormiddag", "tussen de middag", "woensdagnamiddag"
// (zonder \b ervoor, anders mist hij het aan een weekdag vastgeplakte woord).
// Ook in letters: "om vijf uur", "om half vijf", "tijdens de lunch", "een
// uurtje", "enkele uren", "kort gesloten", "tijdelijk gesloten", "beperkt open".
const UREN_IN_LETTERS = "(?:een|twee|drie|vier|vijf|zes|zeven|acht|negen|tien|elf|twaalf)";
const DEEL_VAN_DAG = new RegExp([
  "\\b(?:vroeger|later|halve dag|halve dagen|lunch|lunchpauze|middagpauze)\\b",
  "(?:voor|na)?middag\\w*",
  "ochtend\\w*",
  // "oudejaarsavond" en "kerstavond" zijn dagen, geen dagdelen.
  "(?<!oudejaars|kerst)avond\\w*",
  "'s\\s*(?:ochtends|middags|avonds|namiddags|voormiddags)",
  "\\bhalf\\s+" + UREN_IN_LETTERS + "\\b",
  "\\b(?:om|tot|vanaf|van)\\s+" + UREN_IN_LETTERS + "(?:\\s+uur)?\\b",
  "\\b(?:een\\s+uurtje|enkele\\s+uren|een\\s+paar\\s+uur|paar\\s+uurtjes)\\b",
  "\\b(?:kort|tijdelijk|beperkt|even)\\s+(?:gesloten|open|dicht)\\b",
  "\\b(?:gesloten|open|dicht)\\s+(?:tussen|gedurende)\\b",
].join("|"));
// "vanaf 9 open", "tot 12 gesloten": een kaal getal na vanaf/tot is een uur,
// geen datum — tenzij er een maand of een tweede getal achter staat.
const UURACHTIG = new RegExp(`\\b(?:vanaf|tot)\\s+\\d{1,2}(?!\\s*[/-]?\\d)(?!\\s+(?:${MAAND}))\\b`);
const overDeelVanDag = (z) => DEEL_VAN_DAG.test(z) || KLOKTIJD.test(z) || UURACHTIG.test(z);

const DAG = 86400000;

// Geeft het tijdstip (UTC-middernacht) of null als de datum niet bestaat.
const datumVan = (jaar, maand, dag) => {
  if (!(maand >= 1 && maand <= 12) || !(dag >= 1 && dag <= 31)) return null;
  const t = Date.UTC(jaar, maand - 1, dag);
  const d = new Date(t);
  if (d.getUTCMonth() !== maand - 1 || d.getUTCDate() !== dag) return null; // bv. 31 februari
  return t;
};
const isoVan = (t) => new Date(t).toISOString().slice(0, 10);
const jaarVan = (v) => {
  const n = Number(v);
  if (!n) return null;
  return String(v).length <= 2 ? 2000 + n : n;
};
const maandVan = (naam) => MAANDEN[String(naam || "").replace(/\.$/, "")] || null;

// Jaar ontbreekt: kies het jaar waarbij de begindatum tussen 31 dagen vóór en
// 365 dagen ná de datum van het bericht valt (niet Date.now()).
const kiesJaar = (basis, maand, dag) => {
  const rond = new Date(basis).getUTCFullYear();
  for (const jaar of [rond - 1, rond, rond + 1]) {
    const t = datumVan(jaar, maand, dag);
    if (t === null) continue;
    const dagen = (t - basis) / DAG;
    if (dagen >= -31 && dagen <= 365) return t;
  }
  return null;
};

// Begin- en einddatum van een gelezen bereik, of null als het niet klopt.
const bereik = (basis, eerste, tweede) => {
  const maandEerste = eerste.maand || tweede.maand; // dag zonder maand neemt de maand van de tweede datum
  const maandTweede = tweede.maand;
  if (!maandEerste || !maandTweede) return null;

  const from = eerste.jaar ? datumVan(eerste.jaar, maandEerste, eerste.dag) : kiesJaar(basis, maandEerste, eerste.dag);
  if (from === null) return null;

  const jaarVanFrom = new Date(from).getUTCFullYear();
  let to = tweede.jaar ? datumVan(tweede.jaar, maandTweede, tweede.dag) : datumVan(jaarVanFrom, maandTweede, tweede.dag);
  if (to === null) return null;
  // Loopt het einde vóór het begin, dan valt het in het jaar erna (kerst/nieuwjaar).
  if (to < from && !tweede.jaar) to = datumVan(jaarVanFrom + 1, maandTweede, tweede.dag);
  if (to === null) return null;

  if (to < from) return null;                 // einde vóór begin
  if ((to - from) / DAG > 60) return null;    // langer dan 60 dagen
  // Was de periode al voorbij toen het bericht geschreven werd ("wij waren
  // gesloten op 5 november"), dan valt er niets meer aan te kondigen.
  if (to < basis) return null;
  return { from: isoVan(from), to: isoVan(to) };
};

// De feestdagen (uit hours.js) die in een bereik vallen, als { iso, name }.
export const feestdagenIn = (from, to) => {
  const start = Date.parse(`${from}T00:00:00Z`);
  const eind = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(eind) || eind < start) return [];
  const jaren = [...new Set([new Date(start).getUTCFullYear(), new Date(eind).getUTCFullYear()])];
  return jaren
    .flatMap((j) => holidaysOf(j))
    .filter((h) => h.gesloten && h.iso >= from && h.iso <= to)
    .map((h) => ({ iso: h.iso, name: h.name }))
    .sort((a, b) => (a.iso < b.iso ? -1 : 1));
};

// Een open-bereik langer dan dit is bijna zeker een verkeerde lezing: een
// feestdag duurt één dag.
const MAX_OPEN_DAGEN = 14;

// ---------- datums uit een zin halen ----------

const dagNa = (iso) => isoVan(Date.parse(`${iso}T00:00:00Z`) + DAG);
const dagVoor = (iso) => isoVan(Date.parse(`${iso}T00:00:00Z`) - DAG);
const dagenTussen = (van, tot) => (Date.parse(`${tot}T00:00:00Z`) - Date.parse(`${van}T00:00:00Z`)) / DAG;

// De losse datums uit een opsomming ("24 en 31 december", "6 mei en 7 mei",
// "12, 13 en 14 november"). Een dag zonder maand leent die van de eerstvolgende
// dag die er wél een heeft; staat die er niet, dan van de vorige.
const datumsUitOpsomming = (tekst, basis) => {
  const jaarM = /(?:^|\s)(\d{4})\s*$/.exec(tekst);
  const kaal = jaarM ? tekst.slice(0, jaarM.index) : tekst;
  const jaar = jaarM ? +jaarM[1] : null;

  const tokens = [];
  RE_TOKEN.lastIndex = 0;
  let m;
  while ((m = RE_TOKEN.exec(kaal)) !== null) tokens.push({ dag: +m[1], maand: maandVan(m[2]) });
  if (tokens.length < 2) return [];

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].maand) continue;
    const later = tokens.slice(i + 1).find((t) => t.maand);
    const eerder = [...tokens.slice(0, i)].reverse().find((t) => t.maand);
    tokens[i].maand = (later || eerder || {}).maand || null;
  }

  const uit = [];
  for (const t of tokens) {
    if (!t.maand) return []; // zonder maand valt er niets te lezen
    const hit = bereik(basis, { ...t, jaar }, { ...t, jaar });
    if (!hit) return []; // één onmogelijke of al voorbije datum: de hele opsomming niet
    uit.push(hit.from);
  }
  return uit;
};

// Aaneensluitende dagen worden één periode, de rest blijft apart.
const groepeer = (isos) => {
  const groepen = [];
  for (const iso of [...new Set(isos)].sort()) {
    const laatste = groepen[groepen.length - 1];
    if (laatste && dagNa(laatste.to) === iso) laatste.to = iso;
    else groepen.push({ from: iso, to: iso });
  }
  return groepen;
};

// Zoekt de periodes in een stuk zin, zonder te weten of het om sluiten of
// openen gaat. Geeft een lijst { from, to }, met `index` (waar in de zin) en
// `eenDag` op de eerste.
const periodesIn = (z, basis) => {
  const na = (m) => z.slice(m.index + m[0].length);
  const voor = (m) => z.slice(0, m.index);
  const een = (hit, m, eenDag) => (hit ? [{ ...hit, index: m.index, eenDag }] : []);

  // Een expliciet bereik gaat voor. Wordt het geweigerd (einde vóór begin, of
  // langer dan 60 dagen), dan levert de zin niets op — terugvallen op één van
  // de twee datums zou een verkeerde periode voorstellen.
  let m = RE_CIJFERS.exec(z);
  if (m && !UREN.test(na(m))) {
    return een(bereik(basis,
      { dag: +m[1], maand: +m[2], jaar: jaarVan(m[3]) },
      { dag: +m[4], maand: +m[5], jaar: jaarVan(m[6]) }), m, false);
  }

  m = RE_WOORDEN.exec(z);
  if (m && !UREN.test(na(m))) {
    return een(bereik(basis,
      { dag: +m[1], maand: maandVan(m[2]), jaar: jaarVan(m[3]) },
      { dag: +m[4], maand: maandVan(m[5]), jaar: jaarVan(m[6]) }), m, false);
  }

  // Opsomming: "24 en 31 december" zijn twee dagen, geen bereik van acht.
  m = RE_OPSOMMING.exec(z);
  if (m && !UREN.test(na(m)) && !HALF.test(voor(m))) {
    const groepen = groepeer(datumsUitOpsomming(m[0], basis));
    if (groepen.length) {
      return groepen.map((g, i) => ({ ...g, index: m.index, eenDag: i === 0 && g.from === g.to && groepen.length === 1 }));
    }
    return [];
  }

  m = RE_EEN_WOORD.exec(z);
  if (m && !UREN.test(na(m))) {
    if (HALF.test(voor(m))) return [];
    const d = { dag: +m[1], maand: maandVan(m[2]), jaar: jaarVan(m[3]) };
    const hit = een(bereik(basis, d, d), m, true);
    if (hit.length) return hit;
  }

  m = RE_EEN_CIJFER.exec(z);
  if (m && !UREN.test(na(m))) {
    if (HALF.test(voor(m))) return [];
    const d = { dag: +m[1], maand: +m[2], jaar: jaarVan(m[3]) };
    const hit = een(bereik(basis, d, d), m, true);
    if (hit.length) return hit;
  }

  return [];
};

// Hoe ver staat de datum van het dichtstbijzijnde woord uit `re`?
const afstandTot = (z, idx, bron) => {
  let best = Infinity;
  for (const m of z.matchAll(new RegExp(bron, "g"))) best = Math.min(best, Math.abs(m.index - idx));
  return best;
};

// Zoekt in één zin de lezingen. Geeft een lijst { soort, from, to }, meestal
// leeg of met één element; een opsomming van losse dagen kan er meer geven.
const lezingenInZin = (zin, basis) => {
  const z = zin.toLowerCase().replace(WEEKDAGEN, " ").replace(OPEN_DAG, " ").replace(/\s+/g, " ").trim();

  // "geen sluiting", "wij sluiten niet", "niet met vakantie": van een ontkend
  // sluitingswoord maken we niets. Nooit het omgekeerde van wat er staat.
  if (NIET_DICHT.test(z)) return [];
  // Een ontkenning verderop in de zin telt even hard, zolang er geen
  // openingswoord in staat dat de ontkenning verklaart ("niet open").
  if (NIET_VER.test(z) && SLUITWOORD.test(z) && !OPENWOORD.test(z)) return [];
  // "Wie denkt dat wij gesloten zijn, vergist zich": een gerucht navertellen is
  // geen aankondiging.
  if (GERUCHT.test(z)) return [];

  // "niet open" telt als sluitingswoord. Staat er in dezelfde zin óók een
  // gewone "open" ("open van 9 tot 13 november, niet open op 11 november"),
  // dan is niet te zeggen welke datum bij welke hoort: dan niets.
  const openKeren = (z.match(new RegExp(OPEN_KERN.replace(/^\(\?:/, "(?:"), "g")) || []).length;
  const ontkendeKeren = (z.match(NIET_OPEN) || []).length;
  if (ontkendeKeren && openKeren > ontkendeKeren) return [];
  const ontkend = ontkendeKeren > 0;

  const sluit = SLUITWOORD.test(z) || ontkend;
  const opent = OPENWOORD.test(z) && !ontkend;
  if (!sluit && !opent) return [];

  // Een zin over een stuk van de dag levert niets op.
  if (overDeelVanDag(z)) return [];
  // Over wie gaat de zin? Staat er iemand of iets anders in dat dicht of open
  // kan zijn — een huisarts, een leverancier, een loket, een webshop, een actie
  // — dan is niet te zeggen dat ónze deur dicht gaat. Dan liever niets.
  // "Vakantie-actie: zonnecrème van 12 tot 18 november" werd anders een
  // sluiting van de apotheek, met aftelklok en al.
  if (IEMAND_ANDERS.test(z)) return [];

  // ---- beide betekenissen in één zin ----
  if (sluit && opent) {
    const lijst = periodesIn(z, basis);
    if (!lijst.length) return [];
    const dicht = lijst[0];
    // Hoort de datum bij het sluitings- of bij het openingsgedeelte? "Na de
    // vakantie zijn wij op 4 januari terug open" hoort bij het openen, dus
    // lezen we niets. Zo beslist de betekenis en niet de woordvolgorde.
    if (afstandTot(z, dicht.index, SLUITWOORD.source) > afstandTot(z, dicht.index, OPENWOORD.source)) return [];

    const vanaf = z.search(OPENWOORD);
    const openDeel = vanaf >= 0 ? z.slice(vanaf) : "";
    const open = (openDeel ? periodesIn(openDeel, basis) : [])[0] || null;
    // Zelfde dagen met tegengestelde betekenis: tegenstrijdig, dus niets.
    if (open && open.from <= dicht.to && open.to >= dicht.from) return [];

    const heropening = HEROPENING.test(z);
    if (!heropening) {
      // Zonder heropeningstaal telt alleen de dag-na-regel na een bereik.
      if (open && !dicht.eenDag && open.from === dagNa(dicht.to)) return [{ soort: "gesloten", from: dicht.from, to: dicht.to }];
      return [];
    }
    if (dicht.eenDag) {
      // "Gesloten op 24 december, terug open op 4 januari": dicht tot de dag
      // vóór de heropening. Zonder tweede datum weten we het einde niet.
      if (!open) return [];
      const to = dagVoor(open.from);
      if (dagenTussen(dicht.from, to) < 0 || dagenTussen(dicht.from, to) > 60) return [];
      return [{ soort: "gesloten", from: dicht.from, to }];
    }
    return lijst.map((g) => ({ soort: "gesloten", from: g.from, to: g.to }));
  }

  // ---- alleen sluiten ----
  if (sluit) {
    const lijst = periodesIn(z, basis);
    if (!lijst.length) return [];
    // "Vakantie! Terug op 3 januari": die ene datum is de dag dat ze terug is,
    // niet de dag dat ze sluit.
    if (lijst.length === 1 && lijst[0].eenDag && HEROPENING.test(z)) return [];
    return lijst.map((g) => ({ soort: "gesloten", from: g.from, to: g.to }));
  }

  // ---- alleen openen ----
  // Een open-lezing die geen enkele feestdag raakt is zinloos — dan is de
  // apotheek sowieso open. Zo wordt "wij zijn open op maandag 4 mei" niets.
  return periodesIn(z, basis)
    .filter((g) => dagenTussen(g.from, g.to) <= MAX_OPEN_DAGEN && feestdagenIn(g.from, g.to).length)
    .map((g) => ({ soort: "open", from: g.from, to: g.to, feestdagen: feestdagenIn(g.from, g.to) }));
};

// Een punt na een maandafkorting of in "t.e.m." mag de zin niet doormidden
// knippen: "van 1 dec. t.e.m. 3 dec." is één bereik. Een punt gevolgd door een
// hoofdletter blijft wél een zinseinde, zodat twee zinnen twee zinnen blijven.
const TEM_PUNTEN = /\bt\.\s*e\.\s*m\.?/gi;
const AFKORTING = /\b([Jj]an|[Ff]eb|[Mm]rt|[Aa]pr|[Jj]un|[Jj]ul|[Aa]ug|[Ss]ept?|[Oo]kt|[Nn]ov|[Dd]ec)\.(?=\s*[a-z0-9])/g;
// "9.00 tot 12.00 uur" knipte de zin in stukken, waardoor het eerste stuk
// ("... open van 9") als een hele dag werd gelezen. De punt wordt een u, zodat
// het een uur blijft en de zin heel.
const KLOKPUNT = /\b(\d{1,2})\.(\d{2})\b/g;
// "O.L.H." en "O.L.V.": punten tussen losse letters knippen de zin anders door.
const LETTERPUNTEN = /\b(?:[A-Za-z]\.){2,}/g;
const ontkort = (s) => String(s || "")
  .replace(TEM_PUNTEN, "tem")
  .replace(LETTERPUNTEN, (m) => m.replace(/\./g, ""))
  .replace(KLOKPUNT, "$1u$2")
  .replace(AFKORTING, "$1");

// Titel en tekst in zinnen. De titel is één eigen zin.
const inZinnen = (titel, tekst) =>
  [ontkort(titel), ...ontkort(tekst).split(/[.!?;\n\r]+/)]
    .map((s) => s.trim())
    .filter(Boolean);

// De dag van het bericht, als UTC-middernacht.
const basisVan = (datum) => {
  const tijd = Date.parse(datum || "");
  const d = new Date(Number.isNaN(tijd) ? Date.now() : tijd);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

// ---------- Korte reden voor op de website ----------
// De titel van een bericht is meestal een hele zin ("Apotheek gesloten van 11
// tot en met 15 november"). Die staat op de onthaalpagina dubbel naast de
// datums. Hieruit komt een korte reden, die in /beheer/ nog aan te passen is
// vóór ze online staat.
//
// De feestdagnamen hieronder zijn dezelfde als die van `holidaysOf`; ze staan
// hier als losse lijst omdat een reden uit de tekst gelezen wordt, niet uit een
// datum.
const FEESTDAGEN = [
  "Nieuwjaar", "Feest van de Arbeid", "Nationale feestdag", "O.L.V. Hemelvaart",
  "Allerheiligen", "Wapenstilstand", "Kerstmis",
  "Paasmaandag", "O.L.H. Hemelvaart", "Pinkstermaandag",
];
const MAAND_LOS = new RegExp(`\\b(?:${MAAND})\\b\\.?`, "gi");
const WEEKDAG_LOS = /\b(?:maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)s?\b/gi;
const VERBINDERS = /\b(?:van|vanaf|tot en met|tot|t\/m|tem|op|en|de|het|een)\b/gi;
const WEG_UIT_TITEL = /\b(?:apotheek|gesloten|sluiting|sluiten|dicht|open|geopend|wij|zijn|onze|uw|u|terug|opnieuw|weer|daarna|nadien|ook|nog|dus|niet|geen|meer|toch|enkel|slechts|maar|belangrijk|nieuw|nieuws|update|mededeling|opgelet|let|nader|order|wegens|omwille|door)\b/gi;
// Woorden die een stuk van de dag aanduiden horen ook niet in een reden
// ("Woensdagnamiddag" voor een hele dag).
const DEEL_UIT_TITEL = /(?:voor|na)?middag\w*|ochtend\w*|avond\w*/gi;
// Een reden die met "wegens" of "omwille van" begint mag langer zijn: dat is
// precies de vorm waarin een echte reden geschreven wordt.
const REDEN_PREFIX = /^\s*(?:wegens|omwille van|door)\b/i;

// `zin` is de zin waaruit de periode gelezen werd. Staat die erbij, dan telt
// alleen die zin plus de titel mee: anders werd "Wij zijn gesloten op 12
// november wegens ziekte. Hopelijk tot na de vakantie." op de website
// "Jaarlijkse vakantie".
export const redenUitBericht = ({ titel, tekst, zin, periode } = {}) => {
  const alles = zin ? `${titel || ""} ${zin}` : `${titel || ""} ${tekst || ""}`;
  const l = alles.toLowerCase();
  if (/\bverlof|\bvakantie/.test(l)) return "Jaarlijkse vakantie";
  if (/\bbrug/.test(l)) return "Brugdagen";
  if (/\bopleiding|\bbijscholing/.test(l)) return "Opleiding";
  // Een feestdagnaam telt alleen als die feestdag ook echt in de periode valt:
  // de titel "Kerst en Nieuwjaar" gaf anders "Nieuwjaar" als reden voor een
  // sluiting van 24 tot 26 december.
  const inPeriode = periode ? feestdagenIn(periode.from, periode.to).map((f) => f.name) : null;
  const feest = FEESTDAGEN.find((f) => l.includes(f.toLowerCase()) && (!inPeriode || inPeriode.includes(f)));
  if (feest) return feest;

  // Niets herkenbaars: dan de titel zelf, zonder het datumgedeelte. Van een
  // titel met meerdere zinnen telt de zin met het sluitingswoord; anders bleef
  // van "wij zijn gesloten op zondag; de actie loopt van 21 tot en met 29
  // november" het brokstuk "actie loopt" over, en dat komt op de website.
  const zinnen = ontkort(titel).split(/[.!?;\n\r]+/).map((z) => z.trim()).filter(Boolean);
  const uitTitel = zinnen.find((z) => SLUITWOORD.test(z.toLowerCase()));
  const bron = uitTitel || (zin ? ontkort(zin) : zinnen.join(" "));
  const metPrefix = REDEN_PREFIX.test(bron.replace(/^[^a-zA-Z]+/, "")) || /\b(?:wegens|omwille van)\b/i.test(bron);
  const rest = bron
    .replace(WEEKDAG_LOS, " ")
    .replace(DEEL_UIT_TITEL, " ")
    // "woensdagnamiddag" laat na het dagdeel nog een weekdag staan.
    .replace(WEEKDAG_LOS, " ")
    .replace(MAAND_LOS, " ")
    .replace(/\b\d{1,4}(?:[/-]\d{1,4})*\b/g, " ")
    .replace(VERBINDERS, " ")
    .replace(WEG_UIT_TITEL, " ")
    .replace(/[.,;:!?"'()–—-]+/g, " ")
    // Losse letters ("t e m") zijn geen reden.
    .replace(/\b[a-zA-Z]\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Wat hier staat komt letterlijk op de publieke site. Daarom geen "wat er
  // toevallig overblijft", maar een oordeel: ofwel een reden die met "wegens"
  // of "omwille van" begint, ofwel één of twee echte woorden ("Kerstsluiting",
  // "Wegens ziekte"). Alles daarbuiten — losse brokstukken als "Belangrijk",
  // "Nader order" of "Open" — wordt het neutrale "Gesloten".
  const woorden = rest.split(" ").filter((w) => w.length >= 4);
  if (!woorden.length) return "Gesloten";
  // Afkappen op 40 tekens, maar niet midden in een woord.
  const kort = (t) => (t.length <= 40 ? t : t.slice(0, 40).replace(/\s+\S*$/, "").trim());
  const uit = metPrefix
    ? kort(`wegens ${woorden.join(" ")}`)
    : (woorden.length <= 2 && woorden.join(" ") === rest ? kort(rest) : "");
  if (uit.length < 4) return "Gesloten";
  return uit.charAt(0).toUpperCase() + uit.slice(1);
};

// ---------- Hoe zeker is deze lezing? ----------
// Een lezing kan kloppen en tóch niet zeker genoeg zijn om ze vanzelf op de
// website te zetten. Deze functie geeft de redenen om te twijfelen; is de lijst
// leeg, dan mag ze automatisch. Zo niet, dan wordt het een voorstel dat de
// apotheker bevestigt.
const TWIJFELWOORD = new RegExp([
  "\\b(?:update|correctie|rectificatie|toch|alsnog|geannuleerd|geschrapt|afgelast|verlengd|ingekort|gewijzigd)\\b",
  "\\bwel\\s+open\\b",
  "\\bal\\s+op\\b",
  "\\bvorig\\s+jaar\\b|\\bverleden\\s+jaar\\b",
  "\\bwaren\\s+(?:wij|we)\\b|\\bwas\\s+de\\s+apotheek\\b",
  "\\bbedankt\\s+voor\\s+uw\\s+begrip\\b",
  "\\bneen\\b|\\bhelemaal\\s+niet\\b",
  // Een terugkerende regel ("elke zondag", "de hele winter") is geen enkele
  // periode die je op de site kunt zetten.
  "\\b(?:elke|iedere|telkens|voortaan)\\b|\\bhele\\s+(?:winter|zomer|maand|jaar)\\b",
].join("|"));

const WEEKDAG_NUMMER = { zondag: 0, maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4, vrijdag: 5, zaterdag: 6 };
const RE_WEEKDAG_DAG = /\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\s+(\d{1,2})\b/g;

// Elke datum die in een stuk tekst te herkennen valt, als ISO. Een dag zonder
// maand leent die van de eerstvolgende dag die er wel een heeft.
// Dag met een maandnaam erachter mag ook vlak na een schuine streep staan
// ("24 december/31 december"); een dag-maand in cijfers niet, anders leest hij
// stukken van een telefoonnummer mee.
const RE_DATUM_NAAM = new RegExp(`(?<!\\d)(\\d{1,2})\\s+(${MAAND})\\.?`, "gi");
const RE_DATUM_CIJFER = /(?<![\d/-])(\d{1,2})[/-](\d{1,2})(?![\d/-])/g;
const datumsIn = (tekst, basis) => {
  const tokens = [];
  for (const [re, metNaam] of [[RE_DATUM_NAAM, true], [RE_DATUM_CIJFER, false]]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(tekst)) !== null) {
      tokens.push({ plek: m.index, dag: +m[1], maand: metNaam ? maandVan(String(m[2]).toLowerCase()) : +m[2] });
    }
  }
  tokens.sort((a, b) => a.plek - b.plek);
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].maand) continue;
    const later = tokens.slice(i + 1).find((t) => t.maand);
    const eerder = [...tokens.slice(0, i)].reverse().find((t) => t.maand);
    tokens[i].maand = (later || eerder || {}).maand || null;
  }
  const uit = [];
  for (const t of tokens) {
    if (!t.maand) continue;
    const hit = bereik(basis, { ...t, jaar: null }, { ...t, jaar: null });
    if (hit) uit.push(hit.from);
  }
  return uit;
};

export const twijfelRedenen = ({ titel, tekst, datum } = {}, hit) => {
  if (!hit) return ["geen lezing"];
  const redenen = [];
  const basis = basisVan(datum);
  const zinnen = inZinnen(titel, tekst);
  const heel = zinnen.join(" ").toLowerCase();

  // 1. een correctie, een terugblik of een aanpassing is nooit zeker
  if (TWIJFELWOORD.test(heel)) redenen.push("het bericht leest als een correctie of een terugblik");

  // 2. staat er meer in het bericht dan de ene gelezen periode? Dan is wat we
  // lezen misschien maar de helft. Alleen bij heropeningstaal telt de dag ná de
  // periode niet mee: dat is de dag dat ze terug is.
  const naPeriode = (HEROPENING.test(heel) || OPENWOORD.test(heel))
    ? isoVan(Date.parse(`${hit.to}T00:00:00Z`) + DAG)
    : null;
  const buiten = datumsIn(heel, basis).filter((d) => (d < hit.from || d > hit.to) && d !== naPeriode);
  if (buiten.length) redenen.push(`er staat nog een datum in het bericht (${buiten[0]})`);

  // 3. zegt een andere zin dat ze open is op een dag binnen de gelezen periode,
  // dan spreekt het bericht zichzelf tegen.
  if (hit.soort === "gesloten") {
    for (const zin of zinnen) {
      // De zin die gelezen is, spreekt zichzelf niet tegen: daar hoort de
      // heropening ("... en terug open op 16 november") gewoon bij.
      if (hit.zin && hit.zin.includes(zin)) continue;
      const z = zin.toLowerCase().replace(WEEKDAGEN, " ").replace(OPEN_DAG, " ");
      if (!OPENWOORD.test(z) || NIET_OPEN.test(z)) continue;
      const binnen = datumsIn(z, basis).filter((d) => d >= hit.from && d <= hit.to);
      if (binnen.length) redenen.push(`een andere zin zegt open op ${binnen[0]}`);
    }
  }

  // 4. ergens in het bericht wordt ontkend of tegengesproken. Dan gaat het
  // bericht over de vraag óf ze sluit, en dat beantwoorden wij niet zelf.
  if (NIET_VER.test(heel) || GERUCHT.test(heel)) redenen.push("er staat een ontkenning in het bericht");

  // 4. weekdag die niet bij de datum past. Welke van de twee klopt weten we
  // niet, en juist dat hoort niet zeker te zijn.
  RE_WEEKDAG_DAG.lastIndex = 0;
  let w;
  while ((w = RE_WEEKDAG_DAG.exec(heel)) !== null) {
    const dag = +w[2];
    for (const iso of [hit.from, hit.to]) {
      if (+iso.slice(8, 10) !== dag) continue;
      const echte = new Date(`${iso}T00:00:00Z`).getUTCDay();
      if (echte !== WEEKDAG_NUMMER[w[1]]) redenen.push(`${w[1]} ${dag} klopt niet met ${iso}`);
    }
  }

  // 5. ver van de datum van het bericht: een aankondiging gaat over de komende
  // maanden, niet over volgend jaar.
  const dagen = (Date.parse(`${hit.from}T00:00:00Z`) - basis) / DAG;
  if (dagen > 180) redenen.push("de periode ligt meer dan een half jaar na het bericht");

  return redenen;
};

// Alle lezingen uit een bericht: een lijst { soort, from, to, reason }.
// Meestal nul of één, maar een opsomming van losse dagen ("gesloten op 24 en
// 31 december") geeft er twee. De eerste zin die iets oplevert, telt — zo komt
// een bericht niet uit twee verschillende zinnen tegelijk.
export const sluitingenUitBericht = ({ titel, tekst, datum } = {}) => {
  const basis = basisVan(datum);

  // De titel is één zin, de tekst kan er meer hebben. Eerst elk apart lezen:
  // zegt de titel iets anders dan de tekst ("Gesloten op 11 november" boven
  // "wij zijn toch gewoon open op 11 november"), dan spreken ze elkaar tegen
  // en lezen we niets. Vroeger won de titel stilzwijgend.
  const eerste = (zinnen) => {
    for (const zin of zinnen) {
      const l = lezingenInZin(zin, basis);
      if (l.length) return { lezingen: l, zin };
    }
    return { lezingen: [], zin: "" };
  };
  const uitTitel = eerste(inZinnen(titel, ""));
  const uitTekst = eerste(inZinnen("", tekst));
  const zelfde = (a, b) =>
    a.length === b.length && a.every((x, i) => x.soort === b[i].soort && x.from === b[i].from && x.to === b[i].to);
  if (uitTitel.lezingen.length && uitTekst.lezingen.length && !zelfde(uitTitel.lezingen, uitTekst.lezingen)) return [];

  const bron = uitTitel.lezingen.length ? uitTitel : uitTekst;
  const lezingen = bron.lezingen;
  // Zeggen titel en tekst hetzelfde, dan tellen beide zinnen mee voor de reden:
  // de titel noemt de datums, de tekst vaak het woord ("wij nemen een brug").
  const gelezenZin = uitTitel.lezingen.length && uitTekst.lezingen.length
    ? `${uitTitel.zin} ${uitTekst.zin}`
    : bron.zin;
  if (!lezingen.length) return [];
  // Bij een open-dag zegt de reden welke feestdag het is; bij een sluiting
  // is het de korte reden uit de zin die gelezen werd.
  const reden = redenUitBericht({ titel, tekst, zin: gelezenZin, periode: lezingen[0] });
  return lezingen.map((hit) => ({
    soort: hit.soort,
    from: hit.from,
    to: hit.to,
    // De zin waaruit deze periode komt, zodat de zekerheidstoets weet welke
    // zin ze al gelezen heeft en niet tegen zichzelf gaat redeneren.
    zin: gelezenZin,
    reason: hit.soort === "open"
      ? hit.feestdagen.map((f) => f.name).join(" en ").slice(0, 120)
      : reden,
  }));
};

// De eerste lezing, of null. Voor wie er maar één verwacht.
export const sluitingUitBericht = (bericht) => sluitingenUitBericht(bericht)[0] || null;
