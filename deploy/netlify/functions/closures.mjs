import { getStore } from "@netlify/blobs";

const STORE = "vansuyt";
const CODE = process.env.BEHEER_CODE || "vansuyt29";
const KEYS = { closures: "closures", vacc: "vacc" };

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, X-Beheer-Code",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    },
  });

const str = (v, n) => String(v ?? "").slice(0, n);

const cleanClosures = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((c) => c && /^\d{4}-\d{2}-\d{2}$/.test(c.from || "") && /^\d{4}-\d{2}-\d{2}$/.test(c.to || ""))
    .map((c) => ({ id: str(c.id || `c${Date.now()}`, 40), from: c.from, to: c.to, reason: str(c.reason, 120), note: str(c.note, 600) }))
    .sort((a, b) => (a.from < b.from ? -1 : 1))
    .slice(0, 60);

// { covid: { slots: [...] }, griep: { slots: [...] } }
const cleanVacc = (obj) => {
  const out = {};
  for (const id of ["covid", "griep"]) {
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
  const url = new URL(req.url);
  const which = url.pathname.endsWith("/vacc") ? "vacc" : "closures";
  const store = getStore(STORE);

  if (req.method === "OPTIONS") return json({ ok: true });

  if (req.method === "GET") {
    const data = await store.get(KEYS[which], { type: "json" });
    return which === "vacc"
      ? json({ vacc: cleanVacc(data || {}) })
      : json({ closures: cleanClosures(data || []) });
  }

  if (req.method === "PUT" || req.method === "POST") {
    if (req.headers.get("x-beheer-code") !== CODE) return json({ error: "unauthorized" }, 401);
    let body;
    try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
    if (which === "vacc") {
      const v = cleanVacc(body.vacc);
      await store.setJSON(KEYS.vacc, v);
      return json({ ok: true, vacc: v });
    }
    const list = cleanClosures(body.closures);
    await store.setJSON(KEYS.closures, list);
    return json({ ok: true, closures: list });
  }

  return json({ error: "method not allowed" }, 405);
};

export const config = { path: ["/api/closures", "/api/vacc"] };
