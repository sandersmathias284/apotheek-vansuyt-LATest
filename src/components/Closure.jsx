// Sluitingsperiodes (vakantie / verlof) — store + banner + countdown
import React from "react";
import { HOURS, useNow } from "../lib/hours.js";
import { hrefOf } from "../routes.js";

const CLOSURE_KEY = "vansuyt.closures.v1";
const WACHT_URL = "https://www.apotheek.be/pharmacysearch";
const CLOSURE_API = "/api/closures";

// De server is de bron van waarheid; localStorage is enkel een cache zodat de
// pagina meteen iets kan tonen (en blijft werken als de functie niet draait).
let remoteOk = null;

const readClosures = () => {
  try {
    const raw = localStorage.getItem(CLOSURE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
};

const cacheClosures = (list) => {
  const sorted = [...list].sort((a, b) => (a.from < b.from ? -1 : 1));
  try { localStorage.setItem(CLOSURE_KEY, JSON.stringify(sorted)); } catch (e) {}
  window.dispatchEvent(new CustomEvent("vansuyt:closures"));
  return sorted;
};

// Haalt de centrale lijst op (balk en paneel delen hetzelfde verzoek)
let closuresBezig = null;
const fetchClosures = () => {
  if (!closuresBezig) closuresBezig = fetchClosuresNu().finally(() => { closuresBezig = null; });
  return closuresBezig;
};
const fetchClosuresNu = async () => {
  try {
    const res = await fetch(`${CLOSURE_API}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    remoteOk = true;
    return cacheClosures(Array.isArray(data.closures) ? data.closures : []);
  } catch (e) {
    remoteOk = false;
    return readClosures();
  }
};

// Bewaart de lijst centraal. Geeft {ok, error} terug.
const pushClosures = async (list, code) => {
  const sorted = cacheClosures(list);
  try {
    const res = await fetch(CLOSURE_API, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Beheer-Code": code || "" },
      body: JSON.stringify({ closures: sorted }),
    });
    if (res.status === 401 || res.status === 429) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.melding || "De beheercode werd geweigerd door de server." };
    }
    if (!res.ok) throw new Error(res.status);
    remoteOk = true;
    return { ok: true };
  } catch (e) {
    remoteOk = false;
    return { ok: false, error: "Niet centraal bewaard — enkel op dit toestel. Staat de site al op Netlify?" };
  }
};

const writeClosures = cacheClosures;

const dayStart = (iso) => new Date(`${iso}T00:00:00`);
const dayEnd = (iso) => new Date(`${iso}T23:59:59`);
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtDate = (iso) => {
  if (!iso) return "";
  return dayStart(iso).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" });
};
const fmtDateShort = (iso) => {
  if (!iso) return "";
  return dayStart(iso).toLocaleDateString("nl-BE", { day: "numeric", month: "short" });
};

// Actieve sluiting op moment `now`
const activeClosure = (now, list) => {
  const all = list || readClosures();
  return all.find(c => c.from && c.to && now >= dayStart(c.from) && now <= dayEnd(c.to)) || null;
};

// Volgende geplande sluiting (na vandaag)
const upcomingClosures = (now, list) => {
  const all = list || readClosures();
  return all.filter(c => c.from && dayStart(c.from) > now).sort((a, b) => (a.from < b.from ? -1 : 1));
};

// Moment waarop de apotheek weer opengaat na een sluitingsperiode
const reopenMoment = (closure, list) => {
  const all = list || readClosures();
  let d = dayStart(closure.to);
  d.setDate(d.getDate() + 1);
  for (let i = 0; i < 30; i++) {
    const iso = isoOf(d);
    const inClosure = all.some(c => c.from && c.to && iso >= c.from && iso <= c.to);
    const h = HOURS[(d.getDay() + 6) % 7];
    if (!inClosure && h && h.open) {
      const [hh, mm] = h.open.split(":").map(Number);
      const out = new Date(d);
      out.setHours(hh, mm, 0, 0);
      return out;
    }
    d.setDate(d.getDate() + 1);
  }
  return null;
};

const splitDuration = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
};

const useClosures = () => {
  const [list, setList] = React.useState(readClosures);
  React.useEffect(() => {
    const sync = () => setList(readClosures());
    window.addEventListener("vansuyt:closures", sync);
    window.addEventListener("storage", sync);
    fetchClosures();
    // opnieuw ophalen bij terugkeer naar het tabblad en elke 5 minuten
    const onVis = () => { if (!document.hidden) fetchClosures(); };
    document.addEventListener("visibilitychange", onVis);
    const iv = setInterval(fetchClosures, 300000);
    return () => {
      window.removeEventListener("vansuyt:closures", sync);
      window.removeEventListener("storage", sync);
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(iv);
    };
  }, []);
  return [list, setList];
};

// ---------- Countdown ----------
const Countdown = ({ target, size = "lg" }) => {
  const now = useNow();
  if (!target) return null;
  const d = splitDuration(target - now);
  const cells = [
    [d.days, d.days === 1 ? "dag" : "dagen"],
    [d.hours, "uur"],
    [d.minutes, "min"],
    [d.seconds, "sec"],
  ];
  return (
    <div className={`countdown ${size === "sm" ? "countdown-sm" : ""}`} role="timer" aria-live="off" aria-label={`Nog ${d.days} dagen, ${d.hours} uur en ${d.minutes} minuten`}>
      {cells.map(([v, l], i) => (
        <div className="cd-cell" key={i}>
          <span className="cd-num">{String(v).padStart(2, "0")}</span>
          <span className="cd-lab">{l}</span>
        </div>
      ))}
    </div>
  );
};

// ---------- Smalle balk bovenaan (alle pagina's) ----------
const ClosureBar = ({ setPage }) => {
  const [list] = useClosures();
  const now = useNow();
  const active = activeClosure(now, list);
  if (!active) return null;
  const reopen = reopenMoment(active, list);
  return (
    <div className="closure-bar" role="status">
      <div className="closure-bar-inner">
        <span className="cb-dot" aria-hidden="true"></span>
        <span className="cb-text">
          <strong>Wij zijn gesloten</strong>
          <span className="cb-sep">·</span>
          <time dateTime={active.from}>{fmtDateShort(active.from)}</time> — <time dateTime={active.to}>{fmtDateShort(active.to)}</time>
          {reopen ? <><span className="cb-sep">·</span>opnieuw open op {reopen.toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" })} om {reopen.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}</> : null}
        </span>
        <a className="cb-link" href={WACHT_URL} target="_blank" rel="noreferrer">Apotheek van wacht →</a>
      </div>
    </div>
  );
};

// ---------- Groot paneel op de onthaalpagina ----------
const ClosurePanel = ({ setPage }) => {
  const [list] = useClosures();
  const now = useNow();
  const active = activeClosure(now, list);
  const next = upcomingClosures(now, list)[0];

  if (active) {
    const reopen = reopenMoment(active, list);
    return (
      <section className="container closure-panel-wrap">
        <div className="closure-panel">
          <header className="cp-head">
            <span className="mono">Sluitingsperiode</span>
            <h2>De apotheek is <em>gesloten</em>.</h2>
            <p className="cp-dates"><time dateTime={active.from}>{fmtDate(active.from)}</time> tot en met <time dateTime={active.to}>{fmtDate(active.to)}</time>{active.reason ? ` · ${active.reason}` : ""}</p>
            {active.note ? <p className="cp-note">{active.note}</p> : null}
          </header>
          <div className="cp-timer">
            <span className="mono">Weer open in</span>
            <Countdown target={reopen} />
            {reopen ? (
              <p className="cp-reopen">
                {reopen.toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" })} om {reopen.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}
              </p>
            ) : null}
          </div>
          <div className="cp-actions">
            <a className="btn btn-primary" href={WACHT_URL} target="_blank" rel="noreferrer">
              Apotheek van wacht zoeken
              <span className="arr" aria-hidden="true"></span>
            </a>
            <a className="btn btn-ghost" href={hrefOf("wachtdienst")} onClick={(e) => { e.preventDefault(); setPage && setPage("wachtdienst"); }}>
              Alle wachtinfo
            </a>
          </div>
          <p className="cp-fine">
            Dringend een geneesmiddel nodig? De apotheek van wacht in uw regio vindt u op <a className="inline" href={WACHT_URL} target="_blank" rel="noreferrer">apotheek.be</a> of via <a className="inline" href="tel:090399000">0903 99 000</a>. Huisarts van wacht: <a className="inline" href="tel:1733">1733</a> · Levensgevaar: <a className="inline" href="tel:112">112</a>.
          </p>
        </div>
      </section>
    );
  }

  if (next) {
    const daysAway = Math.ceil((dayStart(next.from) - now) / 86400000);
    if (daysAway > 30) return null;
    return (
      <aside className="container closure-notice-wrap" aria-label="Aangekondigde sluiting">
        <div className="closure-notice">
          <span className="mono">Aangekondigde sluiting</span>
          <p>
            Wij zijn gesloten van <strong>{fmtDate(next.from)}</strong> tot en met <strong>{fmtDate(next.to)}</strong>
            {next.reason ? ` (${next.reason})` : ""} — over {daysAway} {daysAway === 1 ? "dag" : "dagen"}.
            {next.note ? ` ${next.note}` : ""}
          </p>
          <a className="cn-link" href={WACHT_URL} target="_blank" rel="noreferrer">Apotheek van wacht →</a>
        </div>
      </aside>
    );
  }
  return null;
};

const remoteState = () => remoteOk;

// Controleert de beheercode op de server. De code staat dus nergens meer in de
// code van de website zelf.
const checkCode = async (code) => {
  try {
    const res = await fetch("/api/login", { method: "POST", headers: { "X-Beheer-Code": code || "" } });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 429) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.melding || "Onjuiste code. Probeer opnieuw." };
    }
    throw new Error(res.status);
  } catch (e) {
    return { ok: false, error: "Geen verbinding met de server. Probeer het later opnieuw." };
  }
};

export {
  CLOSURE_KEY, WACHT_URL, CLOSURE_API, remoteState, checkCode,
  readClosures, writeClosures, cacheClosures, fetchClosures, pushClosures, useClosures,
  activeClosure, upcomingClosures, reopenMoment,
  dayStart, dayEnd, isoOf, fmtDate, fmtDateShort, splitDuration,
  Countdown, ClosureBar, ClosurePanel,
};
