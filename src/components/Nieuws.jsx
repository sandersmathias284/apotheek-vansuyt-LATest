// Nieuws — berichten uit de posting-app (via /api/berichten).
// Zonder berichten (of zonder verbinding) toont deze sectie niets.
import React from "react";

export const NIEUWS_API = "/api/berichten";

const fmtDag = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" });
};

// Enkel http(s)-links en ons eigen fotopad worden als link of afbeelding gebruikt.
const veiligeUrl = (u) => (typeof u === "string" && /^(https?:\/\/|\/api\/berichten\/foto\/)/.test(u) ? u : null);

export const useBerichten = () => {
  const [berichten, setBerichten] = React.useState([]);
  React.useEffect(() => {
    let weg = false;
    const laad = async () => {
      try {
        const res = await fetch(`${NIEUWS_API}?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        if (!weg && Array.isArray(data.berichten)) setBerichten(data.berichten);
      } catch (e) { /* geen berichten tonen */ }
    };
    laad();
    const iv = setInterval(laad, 300000);
    return () => { weg = true; clearInterval(iv); };
  }, []);
  return berichten;
};

const Knoppen = ({ b, groot }) => {
  const knop = b.knop && veiligeUrl(b.knop.url) ? b.knop : null;
  const fb = veiligeUrl(b.facebookUrl);
  if (!knop && !fb) return null;
  if (!groot) {
    return knop ? <a className="inline" href={knop.url} target="_blank" rel="noreferrer">{knop.label || "Meer info"} →</a> : null;
  }
  return (
    <div className="news-actions">
      {knop ? (
        <a className="btn btn-primary" href={knop.url} target="_blank" rel="noreferrer">
          {knop.label || "Meer info"}<span className="arr" aria-hidden="true"></span>
        </a>
      ) : null}
      {fb ? <a className="news-fb" href={fb} target="_blank" rel="noreferrer">Bekijk op Facebook ↗</a> : null}
    </div>
  );
};

export const Nieuws = () => {
  const berichten = useBerichten();
  if (!berichten.length) return null;
  const [lead, ...rest] = berichten;
  const foto = veiligeUrl(lead.foto);

  return (
    <section className="container section" id="nieuws" aria-labelledby="nieuws-titel">
      <header className="section-head">
        <span className="num">Uit de apotheek</span>
        <h2 id="nieuws-titel">Laatste <em>berichten</em>.</h2>
        <p className="right">Wat we op Facebook posten, staat ook hier — u hebt geen account nodig om het te lezen.</p>
      </header>
      <div className="news-grid">
        <article className={`news-lead ${foto ? "" : "no-photo"}`}>
          {foto ? (
            <div className="news-photo">
              <img src={foto} alt={lead.fotoAlt || ""} loading="lazy" />
            </div>
          ) : null}
          <div className="news-body">
            <div className="news-meta">
              <span className={`news-badge ${lead.vastgezet ? "pinned" : ""}`}>{lead.vastgezet ? "Belangrijk" : "Nieuw"}</span>
              <time className="news-date" dateTime={lead.datum}>{fmtDag(lead.datum)}</time>
            </div>
            {lead.titel ? <h3>{lead.titel}</h3> : null}
            <p className="news-text">{lead.tekst}</p>
            <Knoppen b={lead} groot />
          </div>
        </article>
        {rest.length ? (
          <ul className="news-list">
            {rest.slice(0, 3).map((b) => (
              <li className="news-item" key={b.id}>
                <time className="news-date" dateTime={b.datum}>{fmtDag(b.datum)}</time>
                {b.titel ? <h3>{b.titel}</h3> : null}
                <p>{b.tekst}</p>
                <Knoppen b={b} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
};
