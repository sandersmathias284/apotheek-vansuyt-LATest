// Gedeeld tussen de API en de geplande functie: wat een geldige sluiting is, en
// welke lezing zeker genoeg is om ze vanzelf toe te passen.
//
// Geen Netlify-import, geen React: zo blijft dit bestand te lezen en te testen
// met node, net als de lezer zelf.

import { sluitingenUitBericht } from "./sluiting-lezen.mjs";

const str = (v, n) => String(v ?? "").trim().slice(0, n);

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

// ---------- Zeker genoeg om vanzelf toe te passen ----------
// Zeker is: het bericht levert één lezing op, het is een sluiting, het is één
// aaneengesloten periode, en ze raakt geen sluiting die de apotheker zelf
// ingaf. Al de rest blijft een voorstel dat zij moet bevestigen.
//
// Een opsomming van losse dagen ("gesloten op 24 en 31 december") geeft twee
// lezingen en valt dus buiten "zeker": precies het geval waarin een foute
// lezing er van binnenuit even stellig uitziet als een echte brugperiode.
export const zekereSluiting = (bericht, closures, vandaag) => {
  const lezingen = sluitingenUitBericht(bericht);
  if (lezingen.length !== 1) return null;
  const hit = lezingen[0];
  if (hit.soort !== "gesloten") return null;
  // Een periode die al voorbij is hoeft niet meer op de website; een oud
  // bericht mag de lijst niet vullen met sluitingen van vorig jaar.
  if (vandaag && hit.to < vandaag) return null;
  if (raakt(hit, closures)) return null;
  return hit;
};
