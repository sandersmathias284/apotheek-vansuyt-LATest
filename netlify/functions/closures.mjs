import { getStore } from "@netlify/blobs";

const KEY = "closures";
const STORE = "vansuyt";
const CODE = process.env.BEHEER_CODE || "vansuyt29";

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

const clean = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((c) => c && /^\d{4}-\d{2}-\d{2}$/.test(c.from || "") && /^\d{4}-\d{2}-\d{2}$/.test(c.to || ""))
    .map((c) => ({
      id: String(c.id || `c${Date.now()}`).slice(0, 40),
      from: c.from,
      to: c.to,
      reason: String(c.reason || "").slice(0, 120),
      note: String(c.note || "").slice(0, 600),
    }))
    .sort((a, b) => (a.from < b.from ? -1 : 1))
    .slice(0, 60);

export default async (req) => {
  const store = getStore(STORE);

  if (req.method === "OPTIONS") return json({ ok: true });

  if (req.method === "GET") {
    const data = (await store.get(KEY, { type: "json" })) || [];
    return json({ closures: clean(data) });
  }

  if (req.method === "PUT" || req.method === "POST") {
    if (req.headers.get("x-beheer-code") !== CODE) return json({ error: "unauthorized" }, 401);
    let body;
    try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
    const list = clean(body.closures);
    await store.setJSON(KEY, list);
    return json({ ok: true, closures: list });
  }

  return json({ error: "method not allowed" }, 405);
};

export const config = { path: "/api/closures" };
