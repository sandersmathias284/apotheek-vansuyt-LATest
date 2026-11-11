// Wat een nieuwsbericht met de sluitingen doet. Gedeeld door de API, de
// herscan en de geplande functie, zodat die drie niet uit elkaar lopen.
//
// Geen Netlify-import, geen React: zo blijft dit bestand te lezen en te testen
// met node, net als de lezer zelf.
//
// Twee niveaus:
//   zeker      → meteen in `closures` (of `feestdag-open`), met een melding in
//                /beheer/ en Terugdraaien.
//   niet zeker → voorstel met Toevoegen/Negeren, zoals vroeger.
// Zeker is streng: één lezing uit het bericht, één aaneengesloten periode, ze
// raakt geen sluiting die de apotheker zelf ingaf, en ze is niet voorbij. Een
// opsomming van losse dagen ("gesloten op 24 en 31 december") geeft twee
// lezingen en is dus nooit zeker — precies het geval waarin een foute lezing er
// van binnenuit even stellig uitziet als een echte brugperiode.

import { randomUUID } from "node:crypto";
import { sluitingenUitBericht, feestdagenIn, twijfelRedenen } from "./sluiting-lezen.mjs";

const str = (v, n) => String(v ?? "").trim().slice(0, n);
const isDate = (v) => typeof v === "string" && !Number.isNaN(Date.parse(v));

export const MAX_VOORSTELLEN = 20;
export const MAX_MELDINGEN = 10;
export const MAX_WEG = 50;
export const MAX_FEESTDAG_OPEN = 40;

// De dag zoals ze hier is, niet zoals ze in UTC is: tussen middernacht en
// 1 uur 's nachts scheelt dat een dag, en daar hangt "voorbij" en "nu
// zichtbaar" van af.
export const isoVan = (d = new Date()) => {
  try { return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Brussels" }).format(d); } catch (e) {}
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dagenVerder = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

// ---------- Sluitingsperiodes ----------
export const cleanClosures = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((c) => c && /^\d{4}-\d{2}-\d{2}$/.test(c.from || "") && /^\d{4}-\d{2}-\d{2}$/.test(c.to || ""))
    .map((c) => ({ id: str(c.id || `c${Date.now()}`, 40), from: c.from, to: c.to, reason: str(c.reason, 120), note: str(c.note, 600) }))
    .sort((a, b) => (a.from < b.from ? -1 : 1))
    .slice(0, 60);

// Dekt een bestaande sluiting deze periode al helemaal?
export const gedekt = (hit, closures) => closures.some((c) => c.from <= hit.from && c.to >= hit.to);
// Raakt deze periode een bestaande sluiting, al is het maar één dag?
export const raakt = (hit, closures) => closures.some((c) => c.from <= hit.to && c.to >= hit.from);

// ---------- Dagen waarop de feestdagenlijst niet geldt ----------
export const cleanFeestdagOpen = (list) =>
  [...new Set((Array.isArray(list) ? list : []).filter((v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)))]
    .sort()
    .slice(0, MAX_FEESTDAG_OPEN);

// ---------- Voorstellen én meldingen ----------
// Dezelfde lijst: een melding is een voorstel met `toegepast: true`. Een
// melding blijft staan tot ze weggeklikt wordt of tot de periode voorbij is.
export const cleanVoorstellen = (list, vandaag = isoVan()) => {
  const schoon = (Array.isArray(list) ? list : [])
    .filter((v) => v && /^\d{4}-\d{2}-\d{2}$/.test(v.from || "") && /^\d{4}-\d{2}-\d{2}$/.test(v.to || ""))
    .map((v) => ({
      id: str(v.id, 40) || randomUUID(),
      berichtId: str(v.berichtId, 60),
      berichtDatum: isDate(v.berichtDatum) ? new Date(v.berichtDatum).toISOString() : null,
      berichtTitel: str(v.berichtTitel, 140),
      // Voorstellen van vóór de open-soort hebben geen `soort` en zijn sluitingen.
      soort: v.soort === "open" ? "open" : "gesloten",
      from: v.from,
      to: v.to,
      reason: str(v.reason, 120),
      gemaakt: isDate(v.gemaakt) ? new Date(v.gemaakt).toISOString() : new Date().toISOString(),
      toegepast: v.toegepast === true,
      closureId: str(v.closureId, 40),
      dagen: Array.isArray(v.dagen) ? v.dagen.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 20) : [],
      nuZichtbaar: v.nuZichtbaar === true,
      // Waarom dit een voorstel bleef in plaats van vanzelf te gaan.
      waarom: str(v.waarom, 120),
    }))
    .sort((a, b) => (Date.parse(b.berichtDatum) || 0) - (Date.parse(a.berichtDatum) || 0));

  // Een melding van een periode die al voorbij is, hoeft niet meer. Moet er
  // gesnoeid worden, dan valt de verste weg — niet de lopende, want juist die
  // ziet een klant nu op de site.
  const meldingen = schoon
    .filter((v) => v.toegepast && v.to >= vandaag)
    .sort((a, b) => (a.from < b.from ? -1 : 1))
    .slice(0, MAX_MELDINGEN);
  const voorstellen = schoon.filter((v) => !v.toegepast).slice(0, MAX_VOORSTELLEN);
  return [...meldingen, ...voorstellen].sort((a, b) => (Date.parse(b.berichtDatum) || 0) - (Date.parse(a.berichtDatum) || 0));
};

// Afgehandelde periodes (toegepast, teruggedraaid of genegeerd) worden bewaard
// als "from|to", of "open|from|to" voor een open-dag, zodat hetzelfde bericht
// niet opnieuw iets oplevert — ook niet als de sluiting later weer verdwijnt.
export const schoonWeg = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((k) => typeof k === "string" && /^(?:open\|)?\d{4}-\d{2}-\d{2}\|\d{4}-\d{2}-\d{2}$/.test(k))
    .slice(0, MAX_WEG);
export const voorstelSleutel = (v) => (v.soort === "open" ? `open|${v.from}|${v.to}` : `${v.from}|${v.to}`);

// Teruggedraaid staat apart van afgehandeld. De weg-lijst loopt vol met elke
// behandelde periode, en dan kwam een teruggedraaide sluiting na vijftig andere
// vanzelf terug. Deze lijst wordt alleen door Terugdraaien gevuld, en ze
// verhindert enkel het automatisch toepassen: een nieuw bericht over diezelfde
// dagen mag nog altijd een voorstel geven, zodat een echte aankondiging niet
// in stilte verdwijnt.
export const bewaarTeruggedraaid = async (store, sleutel) => {
  const lijst = schoonWeg((await store.get("closure-teruggedraaid", { type: "json" })) || []);
  await store.setJSON("closure-teruggedraaid", [sleutel, ...lijst.filter((k) => k !== sleutel)].slice(0, MAX_WEG));
};

const alOpen = (hit, feestdagOpen) => {
  const dagen = feestdagenIn(hit.from, hit.to).map((f) => f.iso);
  return dagen.length > 0 && dagen.every((d) => feestdagOpen.includes(d));
};

// Al bekend = al toegepast, er staat al zo'n voorstel, of de apotheker heeft
// die periode eerder afgehandeld.
export const alBekend = (hit, closures, voorstellen, weg, feestdagOpen) =>
  (hit.soort === "open" ? alOpen(hit, feestdagOpen) : gedekt(hit, closures)) ||
  voorstellen.some((v) => v.soort === hit.soort && v.from === hit.from && v.to === hit.to) ||
  weg.includes(voorstelSleutel(hit));

export const voorstelVan = (bericht, hit) => ({
  id: randomUUID(),
  berichtId: bericht.id,
  berichtDatum: bericht.datum,
  berichtTitel: bericht.titel,
  soort: hit.soort === "open" ? "open" : "gesloten",
  from: hit.from,
  to: hit.to,
  reason: hit.reason,
  gemaakt: new Date().toISOString(),
  toegepast: false,
  closureId: "",
  dagen: [],
  nuZichtbaar: false,
  waarom: "",
});

// Zet een afgehandelde periode vooraan in de weg-lijst.
export const bewaarWeg = async (store, sleutel) => {
  const weg = schoonWeg((await store.get("closure-voorstellen-weg", { type: "json" })) || []);
  await store.setJSON("closure-voorstellen-weg", [sleutel, ...weg.filter((k) => k !== sleutel)].slice(0, MAX_WEG));
};

// ---------- Berichten verwerken ----------
// Past de zekere lezingen toe en bewaart de rest als voorstel. Eén ingang voor
// POST /api/berichten, de herscan en de geplande functie.
export const verwerkBerichten = async (store, berichten, { nu = new Date() } = {}) => {
  const vandaag = isoVan(nu);
  const morgen = dagenVerder(vandaag, 1);
  const lijstBerichten = Array.isArray(berichten) ? berichten : [];

  let closures = cleanClosures((await store.get("closures", { type: "json" })) || []);
  let feestdagOpen = cleanFeestdagOpen((await store.get("feestdag-open", { type: "json" })) || []);
  let lijst = cleanVoorstellen((await store.get("closure-voorstellen", { type: "json" })) || [], vandaag);
  let weg = schoonWeg((await store.get("closure-voorstellen-weg", { type: "json" })) || []);
  const teruggedraaid = schoonWeg((await store.get("closure-teruggedraaid", { type: "json" })) || []);

  // Wat de lezer nú uit elk bericht haalt.
  const lezingen = new Map();
  for (const b of lijstBerichten) lezingen.set(b.id, sluitingenUitBericht(b));

  // Een oudere versie van de lezer maakte andere voorstellen. Wat ze vandaag
  // niet meer leest, hoort niet in /beheer/ te blijven staan. Meldingen blijven
  // wel: die horen bij iets dat echt op de website is gezet.
  const voorAf = lijst.length;
  lijst = lijst.filter((v) =>
    v.toegepast ||
    (lezingen.get(v.berichtId) || []).some((h) => h.soort === v.soort && h.from === v.from && h.to === v.to));
  let gewijzigd = lijst.length !== voorAf;

  const toegepast = [];
  for (const b of lijstBerichten) {
    const hits = lezingen.get(b.id) || [];
    for (const hit of hits) {
      if (alBekend(hit, closures, lijst, weg, feestdagOpen)) continue;

      // Zeker: één lezing uit dit bericht, niet voorbij, ze raakt geen sluiting
      // die zij zelf ingaf, en er is niets in het bericht dat doet twijfelen
      // (een tweede datum, een correctie, een weekdag die niet klopt, een
      // periode ver vooruit). Al de rest blijft een voorstel met Toevoegen.
      const twijfel = hits.length > 1
        ? ["meer dan één lezing uit hetzelfde bericht"]
        : teruggedraaid.includes(voorstelSleutel(hit))
          ? ["u hebt deze periode eerder teruggedraaid"]
          : twijfelRedenen(b, hit);
      const zeker = !twijfel.length && hit.to >= vandaag && !raakt(hit, closures);
      if (!zeker) {
        const waarom = twijfel.length ? twijfel[0]
          : hit.to < vandaag ? "de periode is al voorbij"
          : "er staat al een sluiting van u over die dagen";
        lijst = cleanVoorstellen([{ ...voorstelVan(b, hit), waarom }, ...lijst], vandaag);
        gewijzigd = true;
        continue;
      }

      const melding = { ...voorstelVan(b, hit), toegepast: true, nuZichtbaar: hit.from <= morgen };
      if (hit.soort === "open") {
        const dagen = feestdagenIn(hit.from, hit.to).map((f) => f.iso);
        if (!dagen.length) continue;
        feestdagOpen = cleanFeestdagOpen([...feestdagOpen, ...dagen]);
        melding.dagen = dagen;
      } else {
        const closure = { id: `c${Date.now()}${toegepast.length}`, from: hit.from, to: hit.to, reason: hit.reason, note: "" };
        closures = cleanClosures([...closures, closure]);
        melding.closureId = closure.id;
      }
      weg = [voorstelSleutel(hit), ...weg.filter((k) => k !== voorstelSleutel(hit))].slice(0, MAX_WEG);
      lijst = cleanVoorstellen([melding, ...lijst], vandaag);
      toegepast.push(melding);
      gewijzigd = true;
    }
  }

  if (toegepast.length) {
    if (toegepast.some((m) => m.soort === "gesloten")) await store.setJSON("closures", closures);
    if (toegepast.some((m) => m.soort === "open")) await store.setJSON("feestdag-open", feestdagOpen);
    await store.setJSON("closure-voorstellen-weg", weg);
  }
  if (gewijzigd) await store.setJSON("closure-voorstellen", lijst);

  return { toegepast, lijst, closures, feestdagOpen };
};
