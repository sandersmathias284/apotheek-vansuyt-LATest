import { getStore } from "@netlify/blobs";
import { timingSafeEqual, randomUUID, createHash } from "node:crypto";

// API voor de website:
//   GET  /api/closures                 sluitingsperiodes
//   PUT  /api/closures                 sluitingsperiodes bewaren        (code nodig)
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
const cleanClosures = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((c) => c && /^\d{4}-\d{2}-\d{2}$/.test(c.from || "") && /^\d{4}-\d{2}-\d{2}$/.test(c.to || ""))
    .map((c) => ({ id: str(c.id || `c${Date.now()}`, 40), from: c.from, to: c.to, reason: str(c.reason, 120), note: str(c.note, 600) }))
    .sort((a, b) => (a.from < b.from ? -1 : 1))
    .slice(0, 60);

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
    if (req.method === "GET") return json({ closures: cleanClosures((await store.get("closures", { type: "json" })) || []) });
    if (req.method === "PUT" || req.method === "POST") {
      const nee = await bewaak(req, context, store); if (nee) return nee;
      const body = await readBody(req); if (!body) return json({ error: "bad json" }, 400);
      const list = cleanClosures(body.closures);
      await store.setJSON("closures", list);
      return json({ ok: true, closures: list });
    }
    return json({ error: "method not allowed" }, 405);
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
      return json({ ok: true, bericht }, 201);
    }
    return json({ error: "method not allowed" }, 405);
  }

  return json({ error: "not found" }, 404);
};

export const config = { path: ["/api/closures", "/api/login", "/api/berichten", "/api/berichten/*"] };
