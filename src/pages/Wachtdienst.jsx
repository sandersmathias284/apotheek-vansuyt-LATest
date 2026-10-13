// Wachtdienst — apotheek van wacht, huisarts van wacht, spoed
import React from "react";
import { useNow, IS_SERVER } from "../lib/hours.js";
import { computeStatus } from "../components/Chrome.jsx";
import { Icon } from "../components/Icon.jsx";
import { hrefOf } from "../routes.js";

const WACHT_LINES = [
  {
    id: "apotheek",
    kicker: "Officiële wachtdienst",
    title: <>Apotheek van <em>wacht</em></>,
    number: "0903 99 000",
    tel: "090399000",
    href: "https://www.apotheek.be/pharmacysearch",
    hrefLabel: "apotheek.be/pharmacysearch",
    desc: "Het officiële wachtportaal van de Belgische apothekers. Geef uw postcode in en u ziet meteen welke apotheek van wacht is, met adres en openingsuren.",
    note: "Betaalnummer · € 1,50/min. Tussen 22u en 9u wordt u doorverbonden met de wachtapotheek in uw buurt.",
  },
  {
    id: "huisarts",
    kicker: "Huisarts van wacht",
    title: <>Wacht<em>post 1733</em></>,
    number: "1733",
    tel: "1733",
    href: "https://www.wachtpost.be",
    hrefLabel: "wachtpost.be",
    desc: "Voor niet-levensbedreigende medische hulp buiten de uren van uw huisarts — 's avonds, in het weekend en op feestdagen.",
    note: "Gratis nummer. U wordt doorverbonden met de wachtpost of huisarts van wacht in uw regio.",
  },
  {
    id: "spoed",
    kicker: "Levensgevaar",
    title: <>Nood<em>centrale 112</em></>,
    number: "112",
    tel: "112",
    href: "https://www.112.be",
    hrefLabel: "112.be",
    desc: "Bij een levensbedreigende situatie: ademnood, bewustzijnsverlies, zware bloeding, vermoeden van hartinfarct of beroerte. Bel altijd eerst 112.",
    note: "Gratis · 24/7 · ook vanaf een gsm zonder simkaart.",
    urgent: true,
  },
  {
    id: "antigif",
    kicker: "Vergiftiging",
    title: <>Antigif<em>centrum</em></>,
    number: "070 245 245",
    tel: "070245245",
    href: "https://www.antigifcentrum.be/",
    hrefLabel: "antigifcentrum.be",
    desc: "Bij inname van een verkeerd of te veel geneesmiddel, een huishoudproduct, een plant of een bijtende stof. Hou de verpakking bij de hand wanneer u belt.",
    note: "24/7 bereikbaar · zonaal tarief.",
  },
];

const WachtdienstPage = ({ setPage }) => {
  const now = useNow();
  const status = IS_SERVER ? { open: false, server: true } : computeStatus(now);

  return (
    <div className="page">
      <section className="container page-head">
        <div>
          <nav className="breadcrumb" aria-label="Kruimelpad"><span>Apotheek</span> <span aria-hidden="true">/</span> <span aria-current="page">Wachtdienst</span></nav>
          <h1>Buiten <em>onze</em> uren.</h1>
        </div>
        <p className="intro">
          Er is altijd een apotheek van wacht in de buurt. Hieronder staan de officiële nummers en portalen — bewaar deze pagina bij uw favorieten.
        </p>
      </section>

      <section className="container section" style={{ paddingTop: 40 }}>
        <aside className={`wacht-now ${status.open ? "is-open" : "is-closed"}`} aria-live="polite">
          <div className="wacht-now-dot" aria-hidden="true"></div>
          <div className="wacht-now-body">
            <span className="mono">Op dit moment</span>
            <h2>
              {status.server
                ? <>Buiten <em>onze</em> openingsuren?</>
                : status.open
                ? <>Wij zijn <em>open</em> tot {status.until}.</>
                : <>Wij zijn <em>gesloten</em>{status.nextDay ? <> — we openen {status.nextDay} om {status.nextTime}</> : null}.</>}
            </h2>
            <p>
              {status.open
                ? "U kan gewoon langskomen of ons bellen op 051 55 52 64. Geen wachtdienst nodig."
                : "Zoek de dichtstbijzijnde apotheek van wacht via apotheek.be of bel 0903 99 000."}
            </p>
          </div>
          {status.open ? (
            <a className="btn btn-primary" href="tel:+3251555264">Bel de apotheek<span className="arr" aria-hidden="true"></span></a>
          ) : (
            <a className="btn btn-primary" href="https://www.apotheek.be/pharmacysearch" target="_blank" rel="noreferrer">Zoek wachtapotheek<span className="arr" aria-hidden="true"></span></a>
          )}
        </aside>
      </section>

      <section className="container section">
        <header className="section-head">
          <span className="num">Wachtportalen</span>
          <h2>Wie belt u <em>wanneer?</em></h2>
          <p className="right">Vier nummers, elk voor een andere situatie. Bij twijfel over levensgevaar: altijd eerst 112.</p>
        </header>

        <div className="wacht-list">
          {WACHT_LINES.map((w) => (
            <article key={w.id} className={`wacht-card ${w.primary ? "primary" : ""} ${w.urgent ? "urgent" : ""}`}>
              <header className="wacht-card-head">
                <span className="mono">{w.kicker}</span>
                <h3>{w.title}</h3>
              </header>
              <a className="wacht-number" href={`tel:${w.tel}`}>
                <Icon name="phone" className="icon-svg" />
                {w.number}
              </a>
              <p className="wacht-desc">{w.desc}</p>
              <p className="wacht-note">{w.note}</p>
              <a className="wacht-link" href={w.href} target="_blank" rel="noreferrer">↗ {w.hrefLabel}</a>
            </article>
          ))}
        </div>
      </section>

      <section className="container section" style={{ borderBottom: "none" }}>
        <header className="section-head">
          <span className="num">Goed om weten</span>
          <h2>Voor u <em>vertrekt.</em></h2>
          <span></span>
        </header>
        <div className="wacht-tips">
          <article className="wacht-tip">
            <span className="mono">01</span>
            <h3>Bel eerst</h3>
            <p>Bel de wachtapotheek voor u vertrekt. Zo weet u zeker dat uw geneesmiddel in voorraad is en of de deur open is of via een nachtluik werkt.</p>
          </article>
          <article className="wacht-tip">
            <span className="mono">02</span>
            <h3>Neem mee</h3>
            <p>Uw identiteitskaart, het voorschrift (digitaal of op papier) en indien mogelijk de verpakking van uw huidige medicatie.</p>
          </article>
          <article className="wacht-tip">
            <span className="mono">03</span>
            <h3>Wachttoeslag</h3>
            <p>Tijdens de wachtdienst mag een apotheek een wettelijk vastgelegde wachttoeslag aanrekenen. Dat is normaal en geldt in heel België.</p>
          </article>
          <article className="wacht-tip">
            <span className="mono">04</span>
            <h3>Nachtluik</h3>
            <p>Tussen 22u en 9u werken veel wachtapotheken met een beveiligd nachtluik. U belt aan en de apotheker helpt u via het luik.</p>
          </article>
        </div>

        <aside className="callout" style={{ marginTop: 40 }}>
          <span className="mono">Onze eigen uren</span>
          <h3>Wanneer u bij ons terecht kan</h3>
          <p>
            Maandag, dinsdag, donderdag en vrijdag van 08:30 tot 12:00 en van 14:00 tot 19:00.
            Woensdag en zaterdag van 08:30 tot 12:00 — <em>woensdagnamiddag gesloten</em>.
            Zondag gesloten.
            {" "}
            <a className="inline" href={hrefOf("reservatie")} onClick={(e) => { e.preventDefault(); setPage && setPage("reservatie"); }}>Bestelling plaatsen →</a>
          </p>
        </aside>
      </section>
    </div>
  );
};

export { WachtdienstPage, WACHT_LINES };
