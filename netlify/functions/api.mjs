import { getStore } from "@netlify/blobs";
import { timingSafeEqual, randomUUID, createHash } from "node:crypto";
import { sluitingenUitBericht, feestdagenIn } from "./lib/sluiting-lezen.mjs";
import { cleanClosures, gedekt } from "./lib/sluitingen.mjs";

// API voor de website:
//   GET  /api/closures                 sluitingsperiodes + feestdagen die niet gelden
//   PUT  /api/closures                 sluitingsperiodes bewaren        (code nodig)
//   GET  /api/closure-voorstellen      gelezen sluitingen uit berichten (code nodig)
//   POST /api/closure-voorstellen/<id> voorstel toevoegen of negeren    (code nodig)
//   POST /api/closure-voorstellen/<datum> met actie "feestdag-terug"     (code nodig)
//   POST /api/login                    beheercode controleren           (code nodig)
//   GET  /api/berichten                nieuwsberichten voor de website
//   POST /api/berichten                nieuw bericht (posting-app)      (code nodig)
//   DELETE /api/berichten/<id>         bericht verwijderen              (code nodig)
//   GET  /api/berichten/foto/<id>      foto bij een bericht
// (De vaccinatieagenda komt van de tablet-app: apotheekformulier.netlify.app)
//
// "Code nodig" = header  X-Beheer-Code: <code>
// Zet de code op Netlify: Site configuration > Environment variables > BEHEER_CODE.

const STORE = "vansuyt";
// Geen code ingesteld = niemand mag schrijven.
const CODE = process.env.BEHEER_CODE || "";
const MAX_FOTO = 4 * 1024 * 1024; // 4 MB na decoderen
const MAX_BERICHTEN = 50;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Beheer-Code",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS } });
const str = (v, n) => String(v ?? "").trim().slice(0, n);
const auth = (req) => {
  if (!CODE) return false;
  const given = Buffer.from(req.headers.get("x-beheer-code") || "");
  const want = Buffer.from(CODE);
  return given.length === want.length && timingSafeEqual(given, want);
};
// ---------- Te veel foute pogingen ----------
// Na 3 foute codes is dat IP-adres 15 minuten geblokkeerd. Een juiste code zet de teller op nul.
const MAX_FOUTEN = 3;
const BLOKKEER_MS = 15 * 60 * 1000;
const ipVan = (req, context) =>
  context?.ip || req.headers.get("x-nf-client-connection-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "onbekend";
const slotSleutel = (ip) => "slot/" + createHash("sha256").update(ip).digest("hex").slice(0, 32);
const minutenTot = (t) => Math.max(1, Math.ceil((t - Date.now()) / 60000));
const geblokkeerd = (tot) =>
  json({ error: "te veel pogingen", melding: `Te veel foute pogingen. Probeer het opnieuw over ${minutenTot(tot)} minuten.`, wacht: minutenTot(tot) }, 429);

// Geeft null als de code juist is, anders het antwoord (401 of 429) dat terug moet.
const bewaak = async (req, context, store) => {
  const sleutel = slotSleutel(ipVan(req, context));
  const s = (await store.get(sleutel, { type: "json" })) || { fouten: 0, tot: 0 };
  if (s.tot > Date.now()) return geblokkeerd(s.tot);
  if (auth(req)) {
    if (s.fouten || s.tot) await store.delete(sleutel);
    return null;
  }
  const fouten = (s.tot ? 0 : s.fouten) + 1;
  if (fouten >= MAX_FOUTEN) {
    const tot = Date.now() + BLOKKEER_MS;
    await store.setJSON(sleutel, { fouten: 0, tot });
    return geblokkeerd(tot);
  }
  await store.setJSON(sleutel, { fouten, tot: 0 });
  return json({ error: "unauthorized", melding: `Onjuiste code. Nog ${MAX_FOUTEN - fouten} ${MAX_FOUTEN - fouten === 1 ? "poging" : "pogingen"}.` }, 401);
};

const readBody = async (req) => { try { return await req.json(); } catch { return null; } };
const isUrl = (u) => typeof u === "string" && /^https:\/\/[^\s"<>]+$/.test(u) && u.length <= 1000;
const isDate = (v) => typeof v === "string" && !Number.isNaN(Date.parse(v));

// ---------- Sluitingsperiodes ----------
// `cleanClosures` en `gedekt` staan in lib/sluitingen.mjs, omdat de geplande
// functie (auto-sluiting.mjs) met dezelfde regels naar `closures` schrijft.

// ---------- Sluitingsvoorstellen ----------
// Een nieuwsbericht dat een sluiting aankondigt wordt een *voorstel* in
// /beheer/, nooit een sluiting op de website: een foute lezing zou de apotheek
// sluiten terwijl ze open is. De apotheker tikt Toevoegen of Negeren.
//
// Er zijn twee soorten. "gesloten" wordt na Toevoegen een sluitingsperiode in
// `closures`. "open" zegt dat de apotheek op een feestdag toch open is; die
// dagen komen in `feestdag-open`, waarmee de website de feestdagenlijst voor
// net die dagen overslaat. Nooit in `closures`: een sluitingsperiode kan geen
// "open" betekenen.
const MAX_VOORSTELLEN = 20;
const MAX_WEG = 50;
const MAX_FEESTDAG_OPEN = 40;

// Dagen waarop de feestdagenlijst niet geldt.
const cleanFeestdagOpen = (list) =>
  [...new Set((Array.isArray(list) ? list : []).filter((v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)))]
    .sort()
    .slice(0, MAX_FEESTDAG_OPEN);

const cleanVoorstellen = (list) =>
  (Array.isArray(list) ? list : [])
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
    }))
    .sort((a, b) => (Date.parse(b.berichtDatum) || 0) - (Date.parse(a.berichtDatum) || 0))
    .slice(0, MAX_VOORSTELLEN);

// Afgehandelde voorstellen (genegeerd of toegevoegd) worden bewaard als
// "from|to", of "open|from|to" voor een open-dag, zodat hetzelfde bericht niet
// opnieuw een voorstel oplevert — ook niet als de sluiting later weer
// verwijderd wordt.
const schoonWeg = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((k) => typeof k === "string" && /^(?:open\|)?\d{4}-\d{2}-\d{2}\|\d{4}-\d{2}-\d{2}$/.test(k))
    .slice(0, MAX_WEG);
const voorstelSleutel = (v) => (v.soort === "open" ? `open|${v.from}|${v.to}` : `${v.from}|${v.to}`);

// Al bekend = er is al een sluiting die de periode dekt, er staat al zo'n
// voorstel, of de apotheker heeft die periode eerder afgehandeld. Bij een
// open-dag telt een bestaande sluiting niet mee: die wint sowieso al op de
// website, en de apotheker mag zelf zien dat het bericht iets anders zegt.
const alOpen = (hit, feestdagOpen) => {
  const dagen = feestdagenIn(hit.from, hit.to).map((f) => f.iso);
  return dagen.length > 0 && dagen.every((d) => feestdagOpen.includes(d));
};
const alBekend = (hit, closures, voorstellen, weg, feestdagOpen) =>
  (hit.soort === "open" ? alOpen(hit, feestdagOpen) : gedekt(hit, closures)) ||
  voorstellen.some((v) => v.soort === hit.soort && v.from === hit.from && v.to === hit.to) ||
  weg.includes(voorstelSleutel(hit));

// Zet een afgehandelde periode vooraan in de weg-lijst.
const bewaarWeg = async (store, sleutel) => {
  const weg = schoonWeg((await store.get("closure-voorstellen-weg", { type: "json" })) || []);
  await store.setJSON("closure-voorstellen-weg", [sleutel, ...weg.filter((k) => k !== sleutel)].slice(0, MAX_WEG));
};

const voorstelVan = (bericht, hit) => ({
  id: randomUUID(),
  berichtId: bericht.id,
  berichtDatum: bericht.datum,
  berichtTitel: bericht.titel,
  soort: hit.soort === "open" ? "open" : "gesloten",
  from: hit.from,
  to: hit.to,
  reason: hit.reason,
  gemaakt: new Date().toISOString(),
});

// Leest één bericht en bewaart er voorstellen voor. Een opsomming van losse
// dagen ("gesloten op 24 en 31 december") levert er meer dan één op.
const bewaarVoorstel = async (store, bericht) => {
  const hits = sluitingenUitBericht(bericht);
  if (!hits.length) return null;
  const closures = cleanClosures((await store.get("closures", { type: "json" })) || []);
  let voorstellen = cleanVoorstellen((await store.get("closure-voorstellen", { type: "json" })) || []);
  const weg = schoonWeg((await store.get("closure-voorstellen-weg", { type: "json" })) || []);
  const feestdagOpen = cleanFeestdagOpen((await store.get("feestdag-open", { type: "json" })) || []);
  const nieuw = [];
  for (const hit of hits) {
    if (alBekend(hit, closures, voorstellen, weg, feestdagOpen)) continue;
    const v = voorstelVan(bericht, hit);
    nieuw.push(v);
    voorstellen = cleanVoorstellen([v, ...voorstellen]);
  }
  if (!nieuw.length) return null;
  await store.setJSON("closure-voorstellen", voorstellen);
  return nieuw[0];
};

// Leest alle bewaarde berichten opnieuw en vult de lijst aan. Zo komt een
// sluiting uit een ouder bericht ook boven zonder dat er iets getypt wordt.
const herscanBerichten = async (store, voorstellen) => {
  const berichten = (await store.get("berichten", { type: "json" })) || [];
  const closures = cleanClosures((await store.get("closures", { type: "json" })) || []);
  const weg = schoonWeg((await store.get("closure-voorstellen-weg", { type: "json" })) || []);
  const feestdagOpen = cleanFeestdagOpen((await store.get("feestdag-open", { type: "json" })) || []);
  let lijst = voorstellen;
  let nieuw = false;
  for (const b of Array.isArray(berichten) ? berichten : []) {
    for (const hit of sluitingenUitBericht(b)) {
      if (alBekend(hit, closures, lijst, weg, feestdagOpen)) continue;
      lijst = cleanVoorstellen([voorstelVan(b, hit), ...lijst]);
      nieuw = true;
    }
  }
  if (nieuw) await store.setJSON("closure-voorstellen", lijst);
  return lijst;
};

// ---------- Berichten ----------
// Een bericht zoals het bewaard wordt:
// { id, titel, tekst, datum, foto, fotoAlt, knop: {label, url}, facebookUrl, vastgezet, verloopt }
const cleanBericht = (b, id) => {
  const knop = b.knop && isUrl(b.knop.url) ? { label: str(b.knop.label || "Meer info", 40), url: b.knop.url } : null;
  return {
    id,
    titel: str(b.titel, 140),
    tekst: str(b.tekst, 3000),
    datum: isDate(b.datum) ? new Date(b.datum).toISOString() : new Date().toISOString(),
    foto: null,
    fotoAlt: str(b.fotoAlt, 200),
    knop,
    facebookUrl: isUrl(b.facebookUrl) ? b.facebookUrl : null,
    vastgezet: b.vastgezet === true,
    verloopt: isDate(b.verloopt) ? new Date(b.verloopt).toISOString() : null,
  };
};

const zichtbaar = (list, now = Date.now()) =>
  list
    .filter((b) => !b.verloopt || Date.parse(b.verloopt) > now)
    .sort((a, b) => (a.vastgezet !== b.vastgezet ? (a.vastgezet ? -1 : 1) : Date.parse(b.datum) - Date.parse(a.datum)));

const FOTO_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Foto als data-URL ("data:image/jpeg;base64,...") of als https-link.
const bewaarFoto = async (store, id, foto) => {
  if (!foto) return { url: null };
  if (isUrl(foto)) return { url: foto };
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(String(foto));
  if (!m) return { error: "foto moet een https-link of een data-URL (jpeg, png of webp) zijn" };
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > MAX_FOTO) return { error: "foto is groter dan 4 MB" };
  await store.set(`foto/${id}`, bytes, { metadata: { type: m[1] } });
  return { url: `/api/berichten/foto/${id}` };
};

export default async (req, context) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  const path = new URL(req.url).pathname.replace(/\/+$/, "");
  // "strong": wat net bewaard is, is meteen zichtbaar (standaard kan dat tot een minuut duren).
  const store = getStore({ name: STORE, consistency: "strong" });

  if (path.endsWith("/api/login")) {
    if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
    return (await bewaak(req, context, store)) || json({ ok: true });
  }

  if (path.endsWith("/api/closures")) {
    if (req.method === "GET") {
      // De website krijgt in hetzelfde verzoek de dagen waarop de
      // feestdagenlijst niet geldt.
      return json({
        closures: cleanClosures((await store.get("closures", { type: "json" })) || []),
        feestdagOpen: cleanFeestdagOpen((await store.get("feestdag-open", { type: "json" })) || []),
      });
    }
    if (req.method === "PUT" || req.method === "POST") {
      const nee = await bewaak(req, context, store); if (nee) return nee;
      const body = await readBody(req); if (!body) return json({ error: "bad json" }, 400);
      const list = cleanClosures(body.closures);
      await store.setJSON("closures", list);
      return json({ ok: true, closures: list });
    }
    return json({ error: "method not allowed" }, 405);
  }

  if (path.endsWith("/api/closure-voorstellen")) {
    if (req.method !== "GET") return json({ error: "method not allowed" }, 405);
    const nee = await bewaak(req, context, store); if (nee) return nee;
    let lijst = cleanVoorstellen((await store.get("closure-voorstellen", { type: "json" })) || []);
    if (new URL(req.url).searchParams.get("herscan") === "1") lijst = await herscanBerichten(store, lijst);
    return json({ voorstellen: lijst });
  }

  const voorstel = /\/api\/closure-voorstellen\/([A-Za-z0-9-]{1,60})$/.exec(path);
  if (voorstel) {
    if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
    const nee = await bewaak(req, context, store); if (nee) return nee;
    const body = await readBody(req); if (!body) return json({ error: "bad json" }, 400);
    // Een uitgezette feestdag weer laten gelden. Loopt over hetzelfde pad, met
    // de datum in plaats van een voorstel-id, zodat er geen derde route bijkomt.
    if (body.actie === "feestdag-terug") {
      const dag = voorstel[1];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dag)) return json({ error: "datum verwacht" }, 400);
      const nu = cleanFeestdagOpen((await store.get("feestdag-open", { type: "json" })) || []);
      if (!nu.includes(dag)) return json({ error: "not found" }, 404);
      const feestdagOpen = nu.filter((d) => d !== dag);
      await store.setJSON("feestdag-open", feestdagOpen);
      return json({ ok: true, feestdagOpen, melding: "De feestdag geldt weer." });
    }
    const lijst = cleanVoorstellen((await store.get("closure-voorstellen", { type: "json" })) || []);
    const hit = lijst.find((v) => v.id === voorstel[1]);
    if (!hit) return json({ error: "not found" }, 404);
    const rest = lijst.filter((v) => v.id !== hit.id);
    if (body.actie === "toevoegen") {
      const oud = cleanClosures((await store.get("closures", { type: "json" })) || []);
      // Ook een afgehandeld voorstel onthouden: wordt het later weer
      // teruggedraaid, dan mag de herscan het niet opnieuw voorstellen.
      const sleutel = voorstelSleutel(hit);
      if (hit.soort === "open") {
        // Een open-dag wordt nooit een sluitingsperiode: enkel de feestdagen
        // in het bereik worden uitgezet.
        const nu = cleanFeestdagOpen((await store.get("feestdag-open", { type: "json" })) || []);
        const dagen = feestdagenIn(hit.from, hit.to).map((f) => f.iso);
        const feestdagOpen = cleanFeestdagOpen([...nu, ...dagen]);
        const dubbel = dagen.length > 0 && dagen.every((d) => nu.includes(d));
        if (!dubbel) await store.setJSON("feestdag-open", feestdagOpen);
        await store.setJSON("closure-voorstellen", rest);
        await bewaarWeg(store, sleutel);
        return json({
          ok: true, closures: oud, feestdagOpen, dubbel,
          melding: dubbel ? "Die dag stond al als open." : "Feestdag aangepast — de apotheek staat die dag als open.",
        });
      }
      // Ondertussen zelf ingetypt? Dan geen tweede sluiting met dezelfde datums.
      const dubbel = gedekt(hit, oud);
      const reden = str(body.reden, 120) || "Gesloten";
      const closures = dubbel ? oud : cleanClosures([...oud, { id: `c${Date.now()}`, from: hit.from, to: hit.to, reason: reden, note: "" }]);
      if (!dubbel) await store.setJSON("closures", closures);
      await store.setJSON("closure-voorstellen", rest);
      await bewaarWeg(store, sleutel);
      return json({ ok: true, closures, dubbel, melding: dubbel ? "Die periode staat al in de lijst." : "Sluiting toegevoegd." });
    }
    if (body.actie === "negeren") {
      await store.setJSON("closure-voorstellen", rest);
      await bewaarWeg(store, voorstelSleutel(hit));
      return json({ ok: true });
    }
    return json({ error: "actie moet toevoegen of negeren zijn" }, 400);
  }

  const foto = /\/api\/berichten\/foto\/([A-Za-z0-9-]{1,60})$/.exec(path);
  if (foto) {
    if (req.method !== "GET") return json({ error: "method not allowed" }, 405);
    const hit = await store.getWithMetadata(`foto/${foto[1]}`, { type: "arrayBuffer" });
    if (!hit) return json({ error: "not found" }, 404);
    const type = FOTO_TYPES[hit.metadata && hit.metadata.type] ? hit.metadata.type : "image/jpeg";
    return new Response(hit.data, { status: 200, headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable", ...CORS } });
  }

  const enkel = /\/api\/berichten\/([A-Za-z0-9-]{1,60})$/.exec(path);
  if (enkel) {
    if (req.method !== "DELETE") return json({ error: "method not allowed" }, 405);
    const nee = await bewaak(req, context, store); if (nee) return nee;
    const list = (await store.get("berichten", { type: "json" })) || [];
    const next = list.filter((b) => b.id !== enkel[1]);
    if (next.length === list.length) return json({ error: "not found" }, 404);
    await store.setJSON("berichten", next);
    await store.delete(`foto/${enkel[1]}`);
    // Een voorstel van een verwijderd bericht hoort ook weg: anders staat er
    // in /beheer/ een sluiting uit een bericht dat niet meer bestaat.
    try {
      const voorstellen = cleanVoorstellen((await store.get("closure-voorstellen", { type: "json" })) || []);
      const over = voorstellen.filter((v) => v.berichtId !== enkel[1]);
      if (over.length !== voorstellen.length) await store.setJSON("closure-voorstellen", over);
    } catch (e) {}
    return json({ ok: true });
  }

  if (path.endsWith("/api/berichten")) {
    const list = (await store.get("berichten", { type: "json" })) || [];
    if (req.method === "GET") {
      const alles = new URL(req.url).searchParams.get("alles") === "1" && req.headers.has("x-beheer-code") && !(await bewaak(req, context, store));
      return json({ berichten: alles ? zichtbaar(list, 0) : zichtbaar(list).slice(0, 10) });
    }
    if (req.method === "POST") {
      const nee = await bewaak(req, context, store); if (nee) return nee;
      const body = await readBody(req); if (!body) return json({ error: "bad json" }, 400);
      if (!str(body.tekst, 3000) && !str(body.titel, 140)) return json({ error: "tekst of titel is verplicht" }, 400);
      const id = randomUUID();
      const bericht = cleanBericht(body, id);
      const f = await bewaarFoto(store, id, body.foto);
      if (f.error) return json({ error: f.error }, 400);
      bericht.foto = f.url;
      const next = [bericht, ...list].slice(0, MAX_BERICHTEN);
      // foto's van berichten die eruit vallen opruimen
      for (const weg of list.slice(MAX_BERICHTEN - 1)) await store.delete(`foto/${weg.id}`);
      await store.setJSON("berichten", next);
      // Kondigt dit bericht een sluiting aan? Dan komt er een voorstel bij voor
      // /beheer/. Lukt het lezen niet, dan blijft het bericht gewoon staan:
      // een mislukte lezing mag het plaatsen nooit breken.
      try { await bewaarVoorstel(store, bericht); } catch (e) {}
      return json({ ok: true, bericht }, 201);
    }
    return json({ error: "method not allowed" }, 405);
  }

  return json({ error: "not found" }, 404);
};

export const config = { path: ["/api/closures", "/api/closure-voorstellen", "/api/closure-voorstellen/*", "/api/login", "/api/berichten", "/api/berichten/*"] };
