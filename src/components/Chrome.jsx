// Header + Footer + OpenStatus
import React from "react";
import { HOURS, todayIndex, useNow, toMinutes, hhmm, IS_SERVER } from "../lib/hours.js";
import { activeClosure, reopenMoment, fmtDate } from "./Closure.jsx";
import { Icon } from "./Icon.jsx";
import { hrefOf } from "../routes.js";

export const computeStatus = (now) => {
  const cl = activeClosure(now);
  if (cl) return { open: false, label: "Gesloten", closure: cl, reopenAt: reopenMoment(cl) };
  const today = HOURS[todayIndex(now)];
  const nm = now.getHours() * 60 + now.getMinutes();
  const slots = [
    [toMinutes(today.open), toMinutes(today.close)],
    [toMinutes(today.open2), toMinutes(today.close2)],
  ].filter(([a, b]) => a !== null && b !== null);
  for (const [a, b] of slots) {
    if (nm >= a && nm < b) {
      return { open: true, label: "Nu open", until: hhmm(b), minsLeft: b - nm };
    }
  }
  // volgende opening zoeken
  for (let i = 0; i < 7; i++) {
    const d = HOURS[(todayIndex(now) + i) % 7];
    const candidate = toMinutes(d.open);
    if (candidate !== null && (i > 0 || candidate > nm)) {
      return { open: false, label: "Gesloten", nextDay: i === 0 ? "vandaag" : (i === 1 ? "morgen" : d.day.toLowerCase()), nextTime: d.open };
    }
  }
  return { open: false, label: "Gesloten" };
};

export const OpenStatus = ({ variant = "pill" }) => {
  const now = useNow();
  const status = computeStatus(now);
  if (variant === "pill" && IS_SERVER) {
    return (
      <span className="status-pill" title="Openingsuren">
        <span className="status-dot"></span>
        <span className="status-label">Ma–za vanaf 08:30</span>
      </span>
    );
  }
  if (variant === "pill") {
    if (status.closure) {
      return (
        <span className="status-pill closed" title={`Gesloten tot en met ${fmtDate(status.closure.to)}`}>
          <span className="status-dot"></span>
          <span className="status-label">Vakantie</span>
        </span>
      );
    }
    const label = status.open
      ? `Open tot ${status.until}`
      : `Gesloten · opent ${status.nextDay || ""} ${status.nextTime || ""}`.trim();
    return (
      <span className={`status-pill ${status.open ? "open" : "closed"}`} title={label}>
        <span className="status-dot"></span>
        <span className="status-label">{status.open ? `Open tot ${status.until}` : "Gesloten"}</span>
      </span>
    );
  }
  return null;
};

export const NAV_ITEMS = [
  ["home", "Onthaal"],
  ["diensten", "Diensten"],
  ["reservatie", "Reservatie"],
  ["wachtdienst", "Wachtdienst"],
  ["links", "Nuttige links"],
  ["info", "Contact"],
];

export const MAPS_URL = "https://www.google.com/maps/dir/?api=1&destination=Nieuwpoortstraat+29,+8600+Pervijze,+Belgi%C3%AB";

export const Header = ({ page, setPage }) => {
  const [open, setOpen] = React.useState(false);

  // Close on Escape, lock scroll while open
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const go = (id) => { setPage(id); setOpen(false); };

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <a className="brand" href={hrefOf("home")} onClick={(e) => { e.preventDefault(); go("home"); }} aria-label="Apotheek Vansuyt — naar onthaal">
            <img className="brand-logo" src="/assets/logo-web.png" alt="Apotheek Vansuyt" />
          </a>
          <nav className="nav" aria-label="Hoofdnavigatie">
            {NAV_ITEMS.map(([id, label]) => (
              <a
                key={id}
                href={hrefOf(id)}
                className={page === id ? "active" : ""}
                aria-current={page === id ? "page" : undefined}
                onClick={(e) => { e.preventDefault(); go(id); }}
              >{label}</a>
            ))}
          </nav>
          <div className="header-right">
            <OpenStatus />
            <a href="tel:+3251555264" className="phone-cta" aria-label="Bel 051 55 52 64">
              <Icon name="phone" className="icon-svg" />
              <span className="phone-label" aria-hidden="true">051 55 52 64</span>
            </a>
            <button
              className="menu-toggle"
              onClick={() => setOpen(v => !v)}
              aria-expanded={open}
              aria-controls="mobile-drawer"
              aria-label={open ? "Menu sluiten" : "Menu openen"}
            >
              <span className="bars" aria-hidden="true"></span>
            </button>
          </div>
        </div>
      </header>

      <div className={`drawer-scrim ${open ? "open" : ""}`} onClick={() => setOpen(false)} aria-hidden="true"></div>

      <div
        id="mobile-drawer"
        className={`drawer ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        hidden={!open}
      >
        <div className="drawer-head">
          <OpenStatus />
          <button className="drawer-close" onClick={() => setOpen(false)} aria-label="Menu sluiten">×</button>
        </div>
        <nav className="drawer-nav" aria-label="Mobiele navigatie">
          {NAV_ITEMS.map(([id, label], i) => (
            <a
              key={id}
              href={hrefOf(id)}
              className={page === id ? "active" : ""}
              aria-current={page === id ? "page" : undefined}
              onClick={(e) => { e.preventDefault(); go(id); }}
            >
              {label}
              <span className="ix" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
            </a>
          ))}
        </nav>
        <div className="drawer-foot">
          <a className="drawer-phone" href="tel:+3251555264">
            <Icon name="phone" className="icon-svg" />
            051 55 52 64
          </a>
          <address className="drawer-addr">
            Nieuwpoortstraat 29<br/>8600 Pervijze
          </address>
          <a className="drawer-phone" href={MAPS_URL} target="_blank" rel="noreferrer">
            <Icon name="pin" className="icon-svg" />
            Routebeschrijving
          </a>
        </div>
      </div>
    </>
  );
};

export const Footer = ({ setPage }) => (
  <footer className="footer">
    <div className="container">
      <div className="footer-grid">
        <div className="footer-brand">
          <p className="footer-name">Apotheek <em>Vansuyt</em></p>
          <p>Een buurtapotheek in Pervijze, met advies en thuislevering in de regio.</p>
        </div>
        <div>
          <h2>Bezoek ons</h2>
          <address className="footer-list">
            <span>Nieuwpoortstraat 29</span>
            <span>8600 Pervijze</span>
            <span>België</span>
            <span><a href={MAPS_URL} target="_blank" rel="noreferrer">Routebeschrijving →</a></span>
          </address>
        </div>
        <div>
          <h2>Contact</h2>
          <ul className="footer-list">
            <li><a className="mono-val" href="tel:+3251555264">051 55 52 64</a></li>
            <li><a className="mono-val" href="mailto:vansuytapotheek@gmail.com">vansuytapotheek@gmail.com</a></li>
            <li><a href={hrefOf("reservatie")} onClick={(e) => { e.preventDefault(); setPage("reservatie"); }}>Bestelling plaatsen →</a></li>
          </ul>
        </div>
        <div>
          <h2>Openingsuren</h2>
          <dl className="footer-hours">
            <dt>Ma di do vr</dt>
            <dd>08:30–12:00<br/>14:00–19:00</dd>
            <dt>Woensdag</dt>
            <dd>08:30–12:00<br/><em>namiddag gesloten</em></dd>
            <dt>Zaterdag</dt>
            <dd>08:30–12:00</dd>
            <dt>Zondag</dt>
            <dd><em>gesloten</em></dd>
          </dl>
          <ul className="footer-list" style={{ marginTop: 16 }}>
            <li><a href={hrefOf("wachtdienst")} onClick={(e) => { e.preventDefault(); setPage("wachtdienst"); }}>Apotheek van wacht →</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Apotheek Vansuyt</span>
        <span>Pervijze · West-Vlaanderen</span>
      </div>
    </div>
  </footer>
);

