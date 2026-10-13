// Sorteerwijzer — oude & vervallen medicatie
import React from "react";
import { Icon } from "../components/Icon.jsx";
import { hrefOf } from "../routes.js";

const SORT_WEL = [
  { icon: "blister", title: "Pillen & capsules", sub: "in de doordrukstrip" },
  { icon: "tube", title: "Tubes", sub: "met zalf, crème of gel" },
  { icon: "plant", title: "Homeopathie & diergeneesmiddelen", sub: "" },
  { icon: "suppo", title: "Zetpillen & ovules", sub: "" },
  { icon: "inhaler", title: "Sprays & aerosols", sub: "inhalatoren" },
  { icon: "paw", title: "Diergeneesmiddelen", sub: "ook van uw huisdier" },
  { icon: "bottle", title: "Resten van siropen & vloeistoffen", sub: "in hun originele glazen of plastic fles" },
  { icon: "patch", title: "Medicinale pleisters", sub: "zoals pijnpleisters" },
];

const SORT_THUIS = [
  { icon: "box", title: "Karton & papier", text: <>Haal de pillenstrips en flesjes uit de kartonnen omdozen. Gooi de kartonnen doosjes en papieren bijsluiters thuis bij het <strong>oud papier en karton</strong>.</> },
  { icon: "bin", title: "Volledig lege verpakkingen", text: <>Lege plastic blisters, lege glazen flesjes of lege tubes horen thuis in uw eigen <strong>restafval</strong> (of glasbak). <strong>Breng géén lege verpakkingen naar de apotheek.</strong></> },
];

const SORT_NIET = [
  { icon: "syringe", title: "Naalden, spuiten & bloedlancetten", text: "Breng deze (verplicht in een officiële naaldcontainer) naar het recyclagepark of containerpark." },
  { icon: "pill", title: "Vitaminepreparaten & voedingssupplementen", text: "Mogen bij het restafval." },
  { icon: "cosmetic", title: "Cosmetica & verzorgingsproducten", text: "Shampoo, zonnecrème of make-up horen bij het restafval." },
  { icon: "leaf", title: "Kruidenpreparaten & dieetvoeding", text: "Mogen bij het restafval." },
  { icon: "flask", title: "Chemicaliën & radiografieën", text: "Breng deze naar het recyclagepark (KGA — klein gevaarlijk afval)." },
];

const SorteerIcon = ({ name }) => {
  const paths = {
    blister: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="8" cy="10" r="1.3" /><circle cx="12" cy="10" r="1.3" /><circle cx="16" cy="10" r="1.3" /><circle cx="8" cy="14" r="1.3" /><circle cx="12" cy="14" r="1.3" /><circle cx="16" cy="14" r="1.3" /></>,
    tube: <><path d="M9 3h6v4H9z" /><path d="M9 7l-3 13h12L15 7" /><path d="M8 15h8" /></>,
    suppo: <><path d="M12 3c3 0 5 3 5 7v6a5 5 0 01-10 0v-6c0-4 2-7 5-7z" /></>,
    inhaler: <><path d="M9 3h5l1 10H8L9 3z" /><path d="M8 13v6h7v-6" /><path d="M15 16h5v-3h-5" /></>,
    paw: <><circle cx="8" cy="8" r="1.8" /><circle cx="16" cy="8" r="1.8" /><circle cx="5" cy="13" r="1.6" /><circle cx="19" cy="13" r="1.6" /><path d="M12 11c-3 0-5 3-5 5.5A2.5 2.5 0 009.5 19h5a2.5 2.5 0 002.5-2.5C17 14 15 11 12 11z" /></>,
    bottle: <><path d="M10 3h4v3l2 3v10a2 2 0 01-2 2h-4a2 2 0 01-2-2V9l2-3V3z" /><path d="M8 13h8" /></>,
    patch: <><rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-30 12 12)" /><path d="M10 11l1 1M12 10l1 1M11 13l1 1" /></>,
    bin: <><path d="M4 7h16M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></>,
    syringe: <><path d="M4 20l4-4" /><path d="M7 17l9-9 3 3-9 9z" /><path d="M14 6l4 4M19 3l2 2M17 5l2 2" /><path d="M11 13l2 2" /></>,
    cosmetic: <><path d="M9 3h6v5H9z" /><path d="M8 8h8l1 12H7L8 8z" /><path d="M11 12v5" /></>,
    flask: <><path d="M10 3h4M11 3v6l-6 10a1.5 1.5 0 001.3 2.3h11.4A1.5 1.5 0 0019 19l-6-10V3" /><path d="M8 15h8" /></>,
    warn: <><path d="M12 3l10 18H2L12 3z" /><path d="M12 10v5M12 18h.01" /></>,
  };
  const inner = paths[name];
  if (!inner) return <Icon name={name} className="sw-svg" />;
  return (
    <svg viewBox="0 0 24 24" className="sw-svg" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{inner}</svg>
  );
};

const SorteerwijzerPage = ({ setPage }) => (
  <div className="page sorteerwijzer">
    <section className="container page-head">
      <div>
        <nav className="breadcrumb" aria-label="Kruimelpad">
          <a href={hrefOf("diensten")} onClick={(e) => { e.preventDefault(); setPage("diensten"); }}>Diensten</a> <span aria-hidden="true">/</span> <span aria-current="page">Sorteerwijzer</span>
        </nav>
        <h1>Sorteerwijzer:<br/>oude &amp; <em>vervallen</em> medicatie.</h1>
      </div>
      <p className="intro">
        Breng uw ongebruikte geneesmiddelen veilig terug naar de apotheek. Gratis, zonder vragen. Met deze wijzer weet u precies wat u meebrengt — en wat thuis blijft.
      </p>
    </section>

    <section className="container section sw-section" aria-labelledby="sw-wel">
      <header className="section-head">
        <span className="num">01 — Wat brengt u <strong>wel</strong> mee?</span>
        <h2 id="sw-wel">Dit nemen wij <em>gratis</em> aan.</h2>
        <p className="right">Breng deze producten binnen in hun strips, flesjes of tubes — zonder de kartonnen verpakking.</p>
      </header>
      <ul className="sw-grid sw-wel">
        {SORT_WEL.filter(i => i.icon !== "paw").map((i) => (
          <li key={i.title} className="sw-item">
            <span className="sw-icon"><SorteerIcon name={i.icon} /></span>
            <div>
              <h3>{i.title}</h3>
              {i.sub ? <p>{i.sub}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>

    <section className="container section sw-section" aria-labelledby="sw-thuis">
      <header className="section-head">
        <span className="num">02 — Wat doet u <strong>thuis</strong> al?</span>
        <h2 id="sw-thuis">Help ons vlot <em>sorteren</em>.</h2>
        <p className="right">Zo vermijden we extra afval in de apotheek en gaat uw medicatie sneller de juiste weg op.</p>
      </header>
      <div className="sw-two">
        {SORT_THUIS.map((i) => (
          <article key={i.title} className="sw-card">
            <span className="sw-icon lg"><SorteerIcon name={i.icon} /></span>
            <div>
              <h3>{i.title}</h3>
              <p>{i.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>

    <section className="container section sw-section" aria-labelledby="sw-niet">
      <header className="section-head">
        <span className="num">03 — Wat hoort <strong>niet</strong> bij de apotheek?</span>
        <h2 id="sw-niet">Dit mogen wij wettelijk <em>niet</em> aannemen.</h2>
        <p className="right">Sorteer deze producten als volgt.</p>
      </header>
      <ul className="sw-grid sw-niet">
        {SORT_NIET.map((i) => (
          <li key={i.title} className="sw-item">
            <span className="sw-icon no"><SorteerIcon name={i.icon} /></span>
            <div>
              <h3>{i.title}</h3>
              <p>{i.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>

    <section className="container section sw-section" style={{ borderBottom: "none" }}>
      <aside className="sw-warn" aria-labelledby="sw-warn-t">
        <span className="sw-icon warn"><SorteerIcon name="warn" /></span>
        <div>
          <span className="mono">Belangrijke veiligheidstip</span>
          <h3 id="sw-warn-t">Gooi medicatie nooit in de vuilnisbak, de gootsteen of het toilet.</h3>
          <p>Dat is uiterst schadelijk voor het milieu en ons drinkwater. Breng ze mee naar de apotheek — wij zorgen voor een veilige verwerking.</p>
        </div>
        <div className="sw-warn-actions">
          <a className="btn btn-primary" href={hrefOf("info")} onClick={(e) => { e.preventDefault(); setPage("info"); }}>Openingsuren &amp; adres<span className="arr" aria-hidden="true"></span></a>
          <p className="sw-thanks">Bedankt voor uw medewerking.</p>
        </div>
      </aside>
    </section>
  </div>
);

export { SorteerwijzerPage, SORT_WEL, SORT_THUIS, SORT_NIET };
