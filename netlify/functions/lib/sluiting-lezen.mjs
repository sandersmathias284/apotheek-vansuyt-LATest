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
const SLUITWOORD = /\b(?:gesloten|sluiting\w*|sluiten|verlof\w*|vakantie\w*|brug\w*|dicht)\b/;
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
// Het spiegelbeeld: "geen sluiting", "wij sluiten niet", "niet met vakantie".
// Daar maken we niets van — een omgekeerde lezing is erger dan geen voorstel.
// Het ontkennende woord kan er vóór of ná staan.
const NIET_DICHT = new RegExp(
  `\\b${NIET}\\b(?:\\s+\\w+){0,2}\\s+${SLUIT_KERN}\\b|\\b${SLUIT_KERN}\\b(?:\\s+\\w+){0,2}\\s+${NIET}\\b`,
);
// Een opendeurdag is geen openingsuur.
const OPEN_DAG = /\bopen\s*deur\w*|\bopen\s*dag(?:en)?\b/g;
// "open van 9 tot 12 uur", "tot 12 uur open": dat gaat over uren, niet over
// dagen. Zo'n zin levert geen open-dag op.
const UURZIN = /\b\d{1,2}(?:[.:u]\d{2})?\s*(?:uur|u)\b|\bom\s+\d{1,2}\b/;
// Heropeningstaal. "Gesloten van 11 tot en met 15 november en terug open op 16
// november" blijft daardoor een sluiting, en "Vakantie! Terug op 3 januari"
// levert niets op in plaats van een sluiting op de dag dat ze terug is.
const HEROPENING = /\b(?:terug|opnieuw|weer|daarna|nadien|nadat)\b/;
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
  `(?:op\\s+)?${START}\\d{1,2}(?:\\s+(?:${MAAND})\\.?)?(?:\\s*(?:,|\\+|&|en)\\s*(?:op\\s+)?\\d{1,2}(?:\\s+(?:${MAAND})\\.?)?)+(?:\\s+\\d{4})?`,
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
const HALF = /\b(?:tot en met|tot|t\/m|tem|vanaf|van)\s+$/;
// Een zin die over een stuk van de dag gaat, levert niets op: dit model kent
// alleen hele dagen, dus er valt niets eerlijks te schrijven.
// "om 17u", "9:00", "van 12u tot 14u", "tot 12h".
const KLOKTIJD = /\bom\s+\d{1,2}\b|\b\d{1,2}\s*(?:uur|u|h)\b|\b\d{1,2}[.:u]\d{2}\b/;
// "'s namiddags", "in de voormiddag", "tussen de middag", "woensdagnamiddag"
// (zonder \b ervoor, anders mist hij het aan een weekdag vastgeplakte woord).
const DEEL_VAN_DAG = /\b(?:vroeger|later|halve dag|halve dagen)\b|(?:voor|na)?middag\w*|ochtend\w*|avond\w*|'s\s*(?:ochtends|middags|avonds|namiddags|voormiddags)/;
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
const ontkort = (s) => String(s || "").replace(TEM_PUNTEN, "tem").replace(KLOKPUNT, "$1u$2").replace(AFKORTING, "$1");

// Titel en tekst in zinnen. De titel is één eigen zin.
const inZinnen = (titel, tekst) =>
  [ontkort(titel), ...ontkort(tekst).split(/[.!?;\n\r]+/)]
    .map((s) => s.trim())
    .filter(Boolean);

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

export const redenUitBericht = ({ titel, tekst } = {}) => {
  const alles = `${titel || ""} ${tekst || ""}`;
  const l = alles.toLowerCase();
  if (/\bverlof|\bvakantie/.test(l)) return "Jaarlijkse vakantie";
  if (/\bbrug/.test(l)) return "Brugdagen";
  if (/\bopleiding|\bbijscholing/.test(l)) return "Opleiding";
  const feest = FEESTDAGEN.find((f) => l.includes(f.toLowerCase()));
  if (feest) return feest;

  // Niets herkenbaars: dan de titel zelf, zonder het datumgedeelte. Van een
  // titel met meerdere zinnen telt de zin met het sluitingswoord; anders bleef
  // van "wij zijn gesloten op zondag; de actie loopt van 21 tot en met 29
  // november" het brokstuk "actie loopt" over, en dat komt op de website.
  const zinnen = ontkort(titel).split(/[.!?;\n\r]+/).map((z) => z.trim()).filter(Boolean);
  const bron = zinnen.find((z) => SLUITWOORD.test(z.toLowerCase())) || zinnen.join(" ");
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

// Alle lezingen uit één bericht: een lijst { soort, from, to, reason }.
// Meestal nul of één, maar een opsomming van losse dagen ("gesloten op 24 en
// 31 december") geeft er twee. De eerste zin die iets oplevert, telt — zo komt
// een bericht niet uit twee verschillende zinnen tegelijk.
export const sluitingenUitBericht = ({ titel, tekst, datum } = {}) => {
  const tijd = Date.parse(datum || "");
  const d = new Date(Number.isNaN(tijd) ? Date.now() : tijd);
  const basis = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

  for (const zin of inZinnen(titel, tekst)) {
    const lezingen = lezingenInZin(zin, basis);
    if (!lezingen.length) continue;
    // Bij een open-dag zegt de reden welke feestdag het is; bij een sluiting
    // is het de korte reden uit het bericht.
    const reden = redenUitBericht({ titel, tekst });
    return lezingen.map((hit) => ({
      soort: hit.soort,
      from: hit.from,
      to: hit.to,
      reason: hit.soort === "open"
        ? hit.feestdagen.map((f) => f.name).join(" en ").slice(0, 120)
        : reden,
    }));
  }
  return [];
};

// De eerste lezing, of null. Voor wie er maar één verwacht.
export const sluitingUitBericht = (bericht) => sluitingenUitBericht(bericht)[0] || null;
