import { getStore } from "@netlify/blobs";
import { timingSafeEqual, randomUUID } from "node:crypto";

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

export default async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  const path = new URL(req.url).pathname.replace(/\/+$/, "");
  // "strong": wat net bewaard is, is meteen zichtbaar (standaard kan dat tot een minuut duren).
  const store = getStore({ name: STORE, consistency: "strong" });

  if (path.endsWith("/api/login")) {
    if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
    return auth(req) ? json({ ok: true }) : json({ error: "unauthorized" }, 401);
  }

  if (path.endsWith("/api/closures")) {
    if (req.method === "GET") return json({ closures: cleanClosures((await store.get("closures", { type: "json" })) || []) });
    if (req.method === "PUT" || req.method === "POST") {
      if (!auth(req)) return json({ error: "unauthorized" }, 401);
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
    if (!auth(req)) return json({ error: "unauthorized" }, 401);
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
      const alles = new URL(req.url).searchParams.get("alles") === "1" && auth(req);
      return json({ berichten: alles ? zichtbaar(list, 0) : zichtbaar(list).slice(0, 10) });
    }
    if (req.method === "POST") {
      if (!auth(req)) return json({ error: "unauthorized" }, 401);
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
