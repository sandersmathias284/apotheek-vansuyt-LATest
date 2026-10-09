import { getStore } from "@netlify/blobs";

// Eén API voor de website (en later de tablet-app):
//   /api/closures   sluitingsperiodes
//   /api/vacc       vaccinatieagenda (data + beschikbaarheid)
// Schrijven vereist de header  X-Beheer-Code.

const STORE = "vansuyt";
const CODE = process.env.BEHEER_CODE || "vansuyt29";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Beheer-Code",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS } });
const str = (v, n) => String(v ?? "").trim().slice(0, n);
const auth = (req) => req.headers.get("x-beheer-code") === CODE;
const readBody = async (req) => { try { return await req.json(); } catch { return null; } };

const cleanClosures = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((c) => c && /^\d{4}-\d{2}-\d{2}$/.test(c.from || "") && /^\d{4}-\d{2}-\d{2}$/.test(c.to || ""))
    .map((c) => ({ id: str(c.id || `c${Date.now()}`, 40), from: c.from, to: c.to, reason: str(c.reason, 120), note: str(c.note, 600) }))
    .sort((a, b) => (a.from < b.from ? -1 : 1))
    .slice(0, 60);

const TYPES = ["covid", "griep"];
const cleanVacc = (obj) => {
  const out = {};
  for (const id of TYPES) {
    const slots = obj && obj[id] && Array.isArray(obj[id].slots) ? obj[id].slots : null;
    if (!slots) continue;
    out[id] = {
      slots: slots.slice(0, 40).map((s, i) => ({
        id: str(s.id || `${id}-${i}`, 40),
        date: str(s.date, 80),
        time: str(s.time, 60),
        status: ["vrij", "beperkt", "volzet"].includes(s.status) ? s.status : "vrij",
      })),
    };
  }
  return out;
};

export default async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  const path = new URL(req.url).pathname.replace(/\/+$/, "");
  const store = getStore(STORE);

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

  if (path.endsWith("/api/vacc")) {
    if (req.method === "GET") return json({ vacc: cleanVacc((await store.get("vacc", { type: "json" })) || {}) });
    if (req.method === "PUT" || req.method === "POST") {
      if (!auth(req)) return json({ error: "unauthorized" }, 401);
      const body = await readBody(req); if (!body) return json({ error: "bad json" }, 400);
      const v = cleanVacc(body.vacc);
      await store.setJSON("vacc", v);
      return json({ ok: true, vacc: v });
    }
    return json({ error: "method not allowed" }, 405);
  }

  return json({ error: "not found" }, 404);
};

export const config = { path: ["/api/closures", "/api/vacc"] };
