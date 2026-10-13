// Home page
import React from "react";
import { HOURS, todayIndex, useNow, IS_SERVER } from "../lib/hours.js";
import { computeStatus } from "../components/Chrome.jsx";
import { ClosurePanel, Countdown, fmtDateShort, WACHT_URL } from "../components/Closure.jsx";
import { Icon } from "../components/Icon.jsx";
import { Nieuws } from "../components/Nieuws.jsx";
import { hrefOf } from "../routes.js";

// Een greep uit de echte diensten (zie Diensten-pagina).
const SERVICES = [
  { icon: "syringe", title: <>Griep- &amp; <em>covidvaccinatie</em></>, desc: "Griep op zaterdag, andere dagen mits afspraak. Covid op vaste dagen, altijd op afspraak.", to: "diensten", read: "Naar de data" },
  { icon: "bike",    title: <>Thuis<em>levering</em></>, desc: "Wij brengen uw medicatie discreet en op tijd bij u thuis. Geen drempelbedrag.", to: "reservatie", read: "Bestelling plaatsen" },
  { icon: "clock",   title: <>Inname-<em>begeleiding</em></>, desc: "Uitleg over de juiste inname, wisselwerkingen en aandachtspunten — op maat van uw schema.", to: "diensten", read: "Lees verder" },
  { icon: "home",    title: <>Thuiszorg<em>materiaal</em></>, desc: "Krukken, looprek, toiletverhoger en incontinentiemateriaal, aan terugbetaalde prijs.", to: "diensten", read: "Lees verder" },
  { icon: "leaf",    title: <>Fyto-, homeo- &amp; <em>aromazorg</em></>, desc: "Plantextracten, homeopathie en essentiële oliën, afgestemd op uw klacht.", to: "diensten", read: "Lees verder" },
  { icon: "box",     title: <>Vervallen <em>geneesmiddelen</em></>, desc: "Breng ze gratis binnen voor veilige inzameling. De sorteerwijzer toont wat wel en niet mag.", to: "sorteerwijzer", read: "Sorteerwijzer" },
];

export const HomePage = ({ setPage }) => {
  const now = useNow();
  const status = computeStatus(now);
  const tIdx = IS_SERVER ? -1 : todayIndex(now);
  const today = HOURS[Math.max(tIdx, 0)];

  const clockStr = now.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="page">
      <ClosurePanel setPage={setPage} />
      {/* HERO */}
      <section className="container hero">
        <div className="hero-left">
          <div className="hero-eyebrow">
            <span className="line"></span>
            <span className="mono">Apotheek · Pervijze</span>
          </div>
          <h1>
            De apotheek<br/>
            om de hoek,<br/>
            <em>met tijd</em> voor u.
          </h1>
          <p className="hero-sub">Voorschriften klaargemaakt terwijl u wacht.<br/>Advies dat verder gaat dan een doosje.</p>
          <p className="hero-lede">
            Sabine leidt een buurtapotheek waar elke vraag een persoon krijgt — niet een nummer aan de balie.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={hrefOf("reservatie")} onClick={(e) => { e.preventDefault(); setPage("reservatie"); }}>
              Voorschrift indienen
              <span className="arr" aria-hidden="true"></span>
            </a>
            <a className="btn btn-ghost" href={hrefOf("diensten")} onClick={(e) => { e.preventDefault(); setPage("diensten"); }}>
              Ontdek onze diensten
            </a>
          </div>
          <dl className="hero-meta">
            <div>
              <dt>Adres</dt>
              <dd>Nieuwpoortstraat 29<br/><em>8600 Pervijze</em></dd>
            </div>
            <div>
              <dt>Bereikbaar</dt>
              <dd><a href="tel:+3251555264">051 55 52 64</a><br/><em><a href="mailto:vansuytapotheek@gmail.com">vansuytapotheek@gmail.com</a></em></dd>
            </div>
          </dl>
        </div>

        <div className="hero-right">
          <div className="storefront">
            <img src="/assets/interieur-web.jpg" width="1600" height="1200" alt="De toog van Apotheek Vansuyt met de bordeaux hanglampen en de rekken met geneesmiddelen" />
          </div>
          <aside className={`now-card ${status.closure ? "now-card-closed" : ""}`} aria-label="Huidige status">
            {IS_SERVER ? (
              <div>
                <p className="now-label">Openingsuren</p>
                <p className="now-headline">Ma, di, do, vr <em>08:30–12:00 · 14:00–19:00</em></p>
                <p className="now-sub">Wo en za 08:30–12:00. Apotheek van wacht: <a className="inline" href={WACHT_URL} target="_blank" rel="noreferrer">apotheek.be</a> of <a className="inline" href="tel:090399000">0903 99 000</a>.</p>
              </div>
            ) : status.closure ? (
              <>
                <div>
                  <p className="now-label">Gesloten — {fmtDateShort(status.closure.from)} tot {fmtDateShort(status.closure.to)}</p>
                  <p className="now-headline">
                    {status.reopenAt ? <>Weer open <em>{status.reopenAt.toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" })}</em></> : <>Tijdelijk <em>gesloten</em></>}
                  </p>
                  <p className="now-sub">Apotheek van wacht: <a className="inline" href={WACHT_URL} target="_blank" rel="noreferrer">apotheek.be</a> · <a className="inline" href="tel:090399000">0903 99 000</a></p>
                </div>
                <Countdown target={status.reopenAt} size="sm" />
              </>
            ) : (
              <>
                <div>
                  <p className="now-label">{today.day} — {status.open ? "Open vandaag" : "Gesloten"}</p>
                  <p className="now-headline">
                    {status.open
                      ? <>Geopend tot <em>{status.until}</em></>
                      : <>Nu <em>gesloten</em>{status.nextTime ? <> · opent {status.nextDay} {status.nextTime}</> : null}</>
                    }
                  </p>
                  <p className="now-sub">Apotheek van wacht: <a className="inline" href={WACHT_URL} target="_blank" rel="noreferrer">apotheek.be</a> of <a className="inline" href="tel:090399000">0903 99 000</a>.</p>
                </div>
                <time className="now-clock" dateTime={now.toISOString()}>{clockStr}</time>
              </>
            )}
          </aside>
        </div>
      </section>

      {/* NIEUWS — verschijnt enkel als er berichten zijn */}
      <Nieuws />

      {/* SERVICES PREVIEW */}
      <section className="container section">
        <header className="section-head">
          <span className="num">Diensten</span>
          <h2>Wat wij <em>doen</em>, naast pillen tellen.</h2>
          <p className="right">De meeste diensten zonder afspraak. Vaccinaties op afspraak.</p>
        </header>
        <ul className="services">
          {SERVICES.map((s, i) => (
            <li key={i}><a className="service" href={hrefOf(s.to)} onClick={(e) => { e.preventDefault(); setPage(s.to); }}>
              <div className="ix">
                <Icon name={s.icon} />
              </div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <span className="read">{s.read} <span className="read-arr" aria-hidden="true">→</span></span>
            </a></li>
          ))}
        </ul>

        <aside className="order-strip" aria-labelledby="order-strip-title">
          <div>
            <h3 id="order-strip-title">Voorschrift indienen, <em>zonder rij staan.</em></h3>
            <p>Stuur een foto van uw voorschrift door of bel ons. Wij maken het klaar om af te halen — of brengen het aan huis in Pervijze en omstreken.</p>
          </div>
          <div className="actions">
            <a className="btn btn-cream" href={hrefOf("reservatie")} onClick={(e) => { e.preventDefault(); setPage("reservatie"); }}>
              Bestelling plaatsen
              <span className="arr" aria-hidden="true"></span>
            </a>
            <a className="btn btn-outline-cream" href="tel:+3251555264">
              Bel 051 55 52 64
            </a>
          </div>
        </aside>
      </section>

      {/* HOURS */}
      <section className="container section">
        <header className="section-head">
          <span className="num">Openingsuren</span>
          <h2>Open <em>wanneer</em> het past.</h2>
          <p className="right">Onze deur staat zes dagen per week open. Op zon- en feestdagen geldt de wachtdienst.</p>
        </header>
        <div className="hours-block">
          <table className="hours-table">
            <caption className="sr-only">Openingsuren per weekdag</caption>
            <tbody>
              {HOURS.map((h, i) => (
                <tr key={i} className={i === tIdx ? "today" : ""}>
                  <th scope="row">{h.day}</th>
                  <td>
                    {h.open ? (
                      <>
                        {h.open}–{h.close}
                        {h.open2 ? <>  ·  {h.open2}–{h.close2}</> : null}
                      </>
                    ) : (
                      <span className="closed">Gesloten — apotheek van wacht</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="hours-aside">
            <aside className="callout">
              <span className="mono">Wachtdienst</span>
              <h3>Dringend buiten de uren?</h3>
              <p>Zoek de apotheek van wacht via <a className="inline" href="https://www.apotheek.be/pharmacysearch" target="_blank" rel="noreferrer">apotheek.be</a> of bel <a className="inline" href="tel:090399000">0903 99 000</a>. Huisarts van wacht: <a className="inline" href="tel:1733">1733</a>. Bij levensgevaar: <a className="inline" href="tel:112">112</a>. <a className="inline" href={hrefOf("wachtdienst")} onClick={(e) => { e.preventDefault(); setPage("wachtdienst"); }}>Alle wachtinfo →</a></p>
            </aside>
            <aside className="callout">
              <span className="mono">Feestdagen 2026</span>
              <h3>Gesloten op</h3>
              <p>1 januari · Paasmaandag · 1 mei · O.L.H. Hemelvaart · Pinkstermaandag · 21 juli · 15 augustus · 1 &amp; 11 november · 25 december.</p>
            </aside>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="container section" style={{ borderBottom: "none" }}>
        <header className="section-head">
          <span className="num">Het team</span>
          <h2>De mensen <em>achter</em> de balie.</h2>
          <p className="right">Sabine is uw vaste apotheker — zes dagen per week aan de balie.</p>
        </header>
        <div className="team">
          <article className="team-card">
            <div className="portrait">
              <div className="portrait-ph" role="img" aria-label="Portret van Sabine volgt"><span>S</span></div>
            </div>
            <div>
              <h3>Sabine Vansuyt</h3>
              <p className="role">Apotheker–titularis</p>
              <p>Verantwoordelijk apotheker van het huis. Volgde extra opleiding in fytotherapie en houdt een persoonlijk dossier bij voor elke vaste klant.</p>
              <ul className="tags"><li>Titularis</li><li>Fytotherapie</li><li>Inname-begeleiding</li></ul>
            </div>
          </article>
          <article className="team-card">
            <div className="portrait">
              <div className="portrait-ph" role="img" aria-label="Portret van Maïté volgt"><span>M</span></div>
            </div>
            <div>
              <h3>Maïté</h3>
              <p className="role">Apotheker</p>
              <p>Staat samen met Sabine aan de balie. U kan bij haar terecht voor advies over uw medicatie, vaccinaties en de dagelijkse zorgvragen — met evenveel tijd en aandacht.</p>
              <ul className="tags"><li>Advies</li><li>Vaccinaties</li><li>Thuiszorg</li></ul>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
};
