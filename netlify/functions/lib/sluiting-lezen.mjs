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
const NIET_OPEN = /\b(?:niet|nooit|geen)\b(?:\s+\w+){0,3}\s+(?:open|geopend|openen)\b/;
// "niet gesloten" is het spiegelbeeld. Daar maken we niets van: een omgekeerde
// lezing is erger dan geen voorstel.
const NIET_DICHT = /\b(?:niet|nooit|geen)\b(?:\s+\w+){0,3}\s+(?:gesloten|dicht|sluiten)\b/;
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
// op 20 en 21 november — twee losse dagen na elkaar zijn samen één periode.
const RE_EN = new RegExp(`(?:op\\s+)?${START}(\\d{1,2})\\s+en\\s+(\\d{1,2})\\s+(${MAAND})\\.?(?:\\s+(\\d{4}))?`);
// op 11 november  ·  11 november 2026
const RE_EEN_WOORD = new RegExp(`(?:op\\s+)?${START}(\\d{1,2})\\s+(${MAAND})\\.?(?:\\s+(\\d{4}))?`);
// op 24/12 — alleen met "op" ervoor, anders leest ze te veel mee.
const RE_EEN_CIJFER = new RegExp(`op\\s+${START}(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{2,4}))?(?!\\d)`);

// "van 12 tot 13 uur" is geen sluitingsperiode.
const UREN = /^\s*(?:uur|u\b|h\b)/;
// Een losse datum die aan "tot", "t/m", "vanaf" of "van" hangt is een half
// bereik: het andere einde zou een gok zijn, en een gok is erger dan niets.
const HALF = /\b(?:tot en met|tot|t\/m|tem|vanaf|van)\s+$/;
// "om 17u", "om 8u30": een deel van een dag, dus geen sluitingsdag.
const KLOKTIJD = /\bom\s+\d{1,2}(?:[.:u]\d{2}\b|\s*(?:uur|u|h)\b)/;
// "wij sluiten vroeger": ook een deel van een dag.
const DEEL_VAN_DAG = /\b(?:vroeger|later)\b/;

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

// Zoekt de eerste periode in een stuk zin, zonder te weten of het om sluiten of
// openen gaat. Geeft { from, to, eenDag } of null.
const periodeIn = (z, basis) => {
  const na = (m) => z.slice(m.index + m[0].length);
  const voor = (m) => z.slice(0, m.index);
  const uit = (hit, eenDag) => (hit ? { ...hit, eenDag } : null);

  // Staat er een bereik in de zin, dan geldt dát bereik. Wordt het geweigerd
  // (einde vóór begin, of langer dan 60 dagen), dan levert de zin niets op —
  // terugvallen op één van de twee datums zou een verkeerde periode voorstellen.
  let m = RE_CIJFERS.exec(z);
  if (m && !UREN.test(na(m))) {
    return uit(bereik(basis,
      { dag: +m[1], maand: +m[2], jaar: jaarVan(m[3]) },
      { dag: +m[4], maand: +m[5], jaar: jaarVan(m[6]) }), false);
  }

  m = RE_WOORDEN.exec(z);
  if (m && !UREN.test(na(m))) {
    return uit(bereik(basis,
      { dag: +m[1], maand: maandVan(m[2]), jaar: jaarVan(m[3]) },
      { dag: +m[4], maand: maandVan(m[5]), jaar: jaarVan(m[6]) }), false);
  }

  // "op 20 en 21 november" is één periode van twee dagen, geen losse datum.
  m = RE_EN.exec(z);
  if (m && !UREN.test(na(m)) && !HALF.test(voor(m))) {
    const maand = maandVan(m[3]);
    const jaar = jaarVan(m[4]);
    return uit(bereik(basis, { dag: +m[1], maand, jaar }, { dag: +m[2], maand, jaar }), false);
  }

  // Eén datum. Niet als ze aan "tot"/"vanaf" hangt (half bereik) en niet als de
  // zin over een deel van de dag gaat ("sluiten vroeger om 17u").
  if (KLOKTIJD.test(z) || DEEL_VAN_DAG.test(z)) return null;

  m = RE_EEN_WOORD.exec(z);
  if (m && !UREN.test(na(m))) {
    if (HALF.test(voor(m))) return null;
    const een = { dag: +m[1], maand: maandVan(m[2]), jaar: jaarVan(m[3]) };
    const hit = uit(bereik(basis, een, een), true);
    if (hit) return hit;
  }

  m = RE_EEN_CIJFER.exec(z);
  if (m && !UREN.test(na(m))) {
    if (HALF.test(voor(m))) return null;
    const een = { dag: +m[1], maand: +m[2], jaar: jaarVan(m[3]) };
    const hit = uit(bereik(basis, een, een), true);
    if (hit) return hit;
  }

  return null;
};

const dagNa = (iso) => isoVan(Date.parse(`${iso}T00:00:00Z`) + DAG);

// Zoekt in één zin een periode. Geeft { soort, from, to } of null.
const periodeInZin = (zin, basis) => {
  const z = zin.toLowerCase().replace(WEEKDAGEN, " ").replace(OPEN_DAG, " ").replace(/\s+/g, " ").trim();

  // "niet gesloten": geen gok, in geen van beide richtingen.
  if (NIET_DICHT.test(z)) return null;
  const ontkend = NIET_OPEN.test(z);
  // "niet open" telt als sluitingswoord, niet als openingswoord.
  const sluit = SLUITWOORD.test(z) || ontkend;
  const opent = OPENWOORD.test(z) && !ontkend;
  if (!sluit && !opent) return null;

  // Beide betekenissen in één zin. Niet weigeren, maar kijken naar de vorm:
  // een openingsdatum die op of net na het einde van de sluiting valt is een
  // heropening ("gesloten van 11 tot en met 15 november en terug open op 16
  // november"). Overlappen de twee, dan spreken ze elkaar tegen en lezen we
  // niets.
  if (sluit && opent) {
    const dicht = periodeIn(z, basis);
    if (!dicht) return null;
    const vanaf = z.search(OPENWOORD);
    const openDeel = vanaf >= 0 ? z.slice(vanaf) : "";
    const open = openDeel ? periodeIn(openDeel, basis) : null;
    if (open && open.from <= dicht.to && open.to >= dicht.from) return null; // zelfde dagen, andere betekenis
    // "daarna zijn wij weer gewoon open" zet het woord vóór "open", dus kijken
    // we naar de hele zin.
    const heropening = HEROPENING.test(z)
      // "(open op 3 januari)" na een bereik dat de dag ervoor eindigt: ook een
      // heropening. Na een sluiting van één dag is dat te onzeker.
      || (!!open && !dicht.eenDag && open.from === dagNa(dicht.to));
    if (!heropening) return null;
    return { soort: "gesloten", from: dicht.from, to: dicht.to };
  }

  if (sluit) {
    const hit = periodeIn(z, basis);
    if (!hit) return null;
    // "Vakantie! Terug op 3 januari": die ene datum is de dag dat ze terug is,
    // niet de dag dat ze sluit. Eén losse datum naast heropeningstaal lezen we
    // dus niet.
    if (hit.eenDag && HEROPENING.test(z)) return null;
    return { soort: "gesloten", from: hit.from, to: hit.to };
  }

  // Open. Een zin over uren ("open van 9 tot 12 uur") gaat niet over dagen.
  if (UURZIN.test(z)) return null;
  const hit = periodeIn(z, basis);
  if (!hit) return null;
  // Een open-lezing die geen enkele feestdag raakt is zinloos — dan is de
  // apotheek sowieso open. Zo wordt "wij zijn open op maandag 4 mei" niets.
  if ((Date.parse(`${hit.to}T00:00:00Z`) - Date.parse(`${hit.from}T00:00:00Z`)) / DAG > MAX_OPEN_DAGEN) return null;
  const feestdagen = feestdagenIn(hit.from, hit.to);
  if (!feestdagen.length) return null;
  return { soort: "open", from: hit.from, to: hit.to, feestdagen };
};

// Een punt na een maandafkorting of in "t.e.m." mag de zin niet doormidden
// knippen: "van 1 dec. t.e.m. 3 dec." is één bereik. Een punt gevolgd door een
// hoofdletter blijft wél een zinseinde, zodat twee zinnen twee zinnen blijven.
const TEM_PUNTEN = /\bt\.\s*e\.\s*m\.?/gi;
const AFKORTING = /\b([Jj]an|[Ff]eb|[Mm]rt|[Aa]pr|[Jj]un|[Jj]ul|[Aa]ug|[Ss]ept?|[Oo]kt|[Nn]ov|[Dd]ec)\.(?=\s*[a-z0-9])/g;
const ontkort = (s) => String(s || "").replace(TEM_PUNTEN, "tem").replace(AFKORTING, "$1");

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
const WEG_UIT_TITEL = /\b(?:apotheek|gesloten|sluiting|wij|zijn|onze|uw|u|terug|opnieuw|weer|daarna|nadien|ook|nog|dus)\b/gi;

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
  const rest = bron
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
  // Afkappen op 40 tekens, maar niet midden in een woord.
  let uit = rest.slice(0, 40).trim();
  if (rest.length > 40) {
    const opWoord = uit.replace(/\s+\S*$/, "").trim();
    if (opWoord.length >= 4) uit = opWoord;
  }
  // Wat hier staat komt letterlijk op de website. Blijft er geen echt woord
  // over, dan liever het neutrale "Gesloten".
  if (uit.length < 4) return "Gesloten";
  return uit.charAt(0).toUpperCase() + uit.slice(1);
};

// { soort, from, to, reason } of null.
export const sluitingUitBericht = ({ titel, tekst, datum } = {}) => {
  const tijd = Date.parse(datum || "");
  const d = new Date(Number.isNaN(tijd) ? Date.now() : tijd);
  const basis = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

  for (const zin of inZinnen(titel, tekst)) {
    const hit = periodeInZin(zin, basis);
    if (!hit) continue;
    // Bij een open-dag zegt de reden welke feestdag het is; bij een sluiting
    // is het de korte reden uit het bericht.
    const reason = hit.soort === "open"
      ? hit.feestdagen.map((f) => f.name).join(" en ").slice(0, 120)
      : redenUitBericht({ titel, tekst });
    return { soort: hit.soort, from: hit.from, to: hit.to, reason };
  }
  return null;
};
