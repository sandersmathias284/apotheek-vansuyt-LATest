// Feestdagen — één lijst voor de hele site én voor de server.
//
// Dit bestand staat los van hours.js en importeert bewust **geen React**: de
// Netlify-functie leest de sluitingen uit een nieuwsbericht en moet weten welke
// dagen feestdagen zijn, zonder dat React in de functiebundel belandt.
// hours.js exporteert alles hier opnieuw, zodat de rest van de site niets merkt.
//
// Eén lijst voor alles: de open/gesloten-status in de header én de alinea
// "Gesloten op ..." op de onthaalpagina lezen hier. Zo kunnen tekst en status
// niet meer uit elkaar lopen.
//
// Is de apotheek op een feestdag toch open? Zet `gesloten: false` bij die dag;
// dan gelden gewoon de weekuren in hours.js. Er moet niets anders wijzigen.

export const isoDay = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Paaszondag (algoritme van Meeus/Butcher, Gregoriaanse kalender). Drie
// feestdagen hangen eraan vast en schuiven dus elk jaar; zo hoeft niemand
// hier datums bij te typen. Paaszondag en Pinksteren zelf zijn zondagen —
// die staan al als gesloten in HOURS.
export const easterSunday = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return new Date(year, Math.floor(n / 31) - 1, (n % 31) + 1);
};

// Vaste datums (maand 1-12).
const VASTE_FEESTDAGEN = [
  { month: 1,  day: 1,  name: "Nieuwjaar",              label: "1 januari",   gesloten: true },
  { month: 5,  day: 1,  name: "Feest van de Arbeid",    label: "1 mei",       gesloten: true },
  { month: 7,  day: 21, name: "Nationale feestdag",     label: "21 juli",     gesloten: true },
  { month: 8,  day: 15, name: "O.L.V. Hemelvaart",      label: "15 augustus", gesloten: true },
  { month: 11, day: 1,  name: "Allerheiligen",          label: "1 november",  gesloten: true },
  { month: 11, day: 11, name: "Wapenstilstand",         label: "11 november", gesloten: true },
  { month: 12, day: 25, name: "Kerstmis",               label: "25 december", gesloten: true },
];

// Beweeglijke dagen: aantal dagen na Paaszondag.
const PAAS_FEESTDAGEN = [
  { offset: 1,  name: "Paasmaandag",       label: "Paasmaandag",       gesloten: true },
  { offset: 39, name: "O.L.H. Hemelvaart", label: "O.L.H. Hemelvaart", gesloten: true },
  { offset: 50, name: "Pinkstermaandag",   label: "Pinkstermaandag",   gesloten: true },
];

const feestdagenCache = new Map();

// Alle feestdagen van één jaar, op datum gesorteerd.
export const holidaysOf = (year) => {
  if (!feestdagenCache.has(year)) {
    const pasen = easterSunday(year);
    const lijst = [
      ...VASTE_FEESTDAGEN.map((h) => ({ ...h, date: new Date(year, h.month - 1, h.day) })),
      ...PAAS_FEESTDAGEN.map((h) => {
        const d = new Date(pasen);
        d.setDate(d.getDate() + h.offset);
        return { ...h, date: d };
      }),
    ]
      .sort((a, b) => a.date - b.date)
      .map((h) => ({ ...h, iso: isoDay(h.date) }));
    feestdagenCache.set(year, lijst);
  }
  return feestdagenCache.get(year);
};

// De feestdag van die dag, of null.
export const holidayOn = (d = new Date()) => {
  const iso = isoDay(d);
  return holidaysOf(d.getFullYear()).find((h) => h.iso === iso) || null;
};

// ---------- Feestdagen waarop de apotheek tóch open is ----------
// Een nieuwsbericht gaat vóór de lijst hierboven: zegt de apotheker in een
// bericht dat ze op een feestdag gewoon open is, dan geldt die dag niet.
// Closure.jsx vult deze lijst met wat /api/closures meegeeft — hier gebeurt
// geen fetch, zodat dit bestand puur blijft (net zoals `remoteOk` daar).
let feestdagOpen = [];
export const setFeestdagOpen = (lijst) => {
  feestdagOpen = Array.isArray(lijst) ? lijst.filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v)) : [];
};
export const isFeestdagOpen = (iso) => feestdagOpen.includes(iso);

// Enkel de feestdagen waarop de apotheek gesloten is.
export const closedHolidayOn = (d = new Date()) => {
  const h = holidayOn(d);
  if (!h || !h.gesloten) return null;
  return isFeestdagOpen(isoDay(d)) ? null : h;
};

// De eerstvolgende sluitingsdagen vanaf vandaag, over de jaargrens heen. Zo
// staat er in november geen "1 januari" meer van een jaar dat al voorbij is, en
// hoeft een bezoeker niet te weten wanneer Pinkstermaandag valt: de datum staat
// erbij. Van een volgend jaar krijgt de dag het jaartal mee.
export const upcomingHolidays = (now = new Date(), aantal = 6) => {
  const vandaag = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const jaar = now.getFullYear();
  return [...holidaysOf(jaar), ...holidaysOf(jaar + 1)]
    .filter((h) => h.gesloten && h.date >= vandaag)
    .slice(0, aantal)
    .map((h) => {
      const dag = h.date.toLocaleDateString("nl-BE", { day: "numeric", month: "long" });
      const jaartal = h.date.getFullYear() === jaar ? "" : ` ${h.date.getFullYear()}`;
      return { ...h, whenLabel: `${h.name} ${dag}${jaartal}` };
    });
};
