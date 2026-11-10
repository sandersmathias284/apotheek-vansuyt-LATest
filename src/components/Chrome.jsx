// Header + Footer + OpenStatus
import React from "react";
import { HOURS, todayIndex, useNow, toMinutes, hhmm, IS_SERVER, closedHolidayOn } from "../lib/hours.js";
import { activeClosure, reopenMoment, fmtDate } from "./Closure.jsx";
import { Icon } from "./Icon.jsx";
import { hrefOf } from "../routes.js";

// Eerstvolgende opening vanaf `now`. Slaat sluitingsdagen over: zondag en
// woensdagnamiddag via HOURS, feestdagen via closedHolidayOn.
// `nm` = de minuut van vandaag waarna de opening nog moet komen (null = heel vandaag meetellen).
const nextOpening = (now, nm) => {
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const h = HOURS[todayIndex(d)];
    if (closedHolidayOn(d)) continue;
    // beide blokken: tussen 12:00 en 14:00 gaat de deur vandaag nog open
    for (const o of [h.open, h.open2]) {
      const candidate = toMinutes(o);
      if (candidate === null) continue;
      if (i === 0 && (nm === null || candidate <= nm)) continue;
      return { nextDay: i === 1 ? "morgen" : (i === 0 ? "vandaag" : h.day.toLowerCase()), nextTime: o };
    }
  }
  return {};
};

// Rangorde, van sterk naar zwak:
//   1. een sluitingsperiode die de apotheker zelf bewaarde (activeClosure)
//   2. een feestdag die een nieuwsbericht open verklaarde (feestdag-open, via
//      closedHolidayOn)
//   3. de feestdagenlijst in hours.js
//   4. de weekuren in HOURS
// Het bericht gaat dus vóór de lijst — die lijst is een aanname, geen wet. Maar
// een sluiting die zij zelf ingaf gaat vóór het bericht, zodat een verkeerd
// gelezen bericht nooit de deur kan openzetten tijdens haar vakantie.
export const computeStatus = (now) => {
  const cl = activeClosure(now);
  if (cl) return { open: false, label: "Gesloten", closure: cl, reopenAt: reopenMoment(cl) };
  // Feestdag vóór de weekdag: op 11 november staat de deur dicht, ook al zegt
  // de woensdagregel 08:30-12:00.
  const feestdag = closedHolidayOn(now);
  if (feestdag) return { open: false, label: "Gesloten", holiday: feestdag, ...nextOpening(now, null) };
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
  return { open: false, label: "Gesloten", ...nextOpening(now, nm) };
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
    // Gesloten zonder meer zegt te weinig: wanneer de deur weer opengaat staat
    // in de pil zelf, niet in een tooltip (die bestaat niet op een telefoon).
    return (
      <span className={`status-pill ${status.open ? "open" : "closed"}`}>
        <span className="status-dot"></span>
        <span className="status-label">
          {status.open ? `Open tot ${status.until}` : "Gesloten"}
          {!status.open && status.nextTime ? (
            <span className="status-when"> · opent {status.nextDay} {status.nextTime}</span>
          ) : null}
        </span>
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
  const toggleRef = React.useRef(null);
  const drawerRef = React.useRef(null);

  // Escape sluit het menu, de focus blijft binnen het paneel zolang het open
  // staat, en de pagina erachter scrollt niet mee.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key !== "Tab" || !drawerRef.current) return;
      const items = drawerRef.current.querySelectorAll("a[href], button");
      if (!items.length) return;
      const eerste = items[0];
      const laatste = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === eerste || !drawerRef.current.contains(document.activeElement))) {
        e.preventDefault();
        laatste.focus();
      } else if (!e.shiftKey && document.activeElement === laatste) {
        e.preventDefault();
        eerste.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // eerste knop in het paneel krijgt de focus, zodat de volgende Tab binnen blijft
    const eerste = drawerRef.current && drawerRef.current.querySelector("a[href], button");
    if (eerste) eerste.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      // na sluiten staat de focus terug op de menuknop
      if (toggleRef.current) toggleRef.current.focus();
    };
  }, [open]);

  const go = (id) => { setPage(id); setOpen(false); };

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <a className="brand" href={hrefOf("home")} onClick={(e) => { e.preventDefault(); go("home"); }} aria-label="Apotheek Vansuyt — naar onthaal">
            <img className="brand-logo" src="/assets/logo-web.png" srcSet="/assets/logo-400.png 400w, /assets/logo-web.png 800w" sizes="(max-width: 420px) 126px, (max-width: 1240px) 171px, 198px" width="800" height="178" alt="Apotheek Vansuyt" />
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
              ref={toggleRef}
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

      {/* Gesloten bestaat dit paneel niet voor oog, Tab of schermlezer: de CSS
          zet het op visibility:hidden (het `hidden`-kenmerk werd overschreven
          door display:flex en liet negen onzichtbare tabstops staan). */}
      <div
        id="mobile-drawer"
        ref={drawerRef}
        className={`drawer ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
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

