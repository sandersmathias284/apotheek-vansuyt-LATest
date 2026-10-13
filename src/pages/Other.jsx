// Reservatie + Links + Info
import React from "react";
import { Icon } from "../components/Icon.jsx";
import { MAPS_URL } from "../components/Chrome.jsx";

// ============ RESERVATIE ============
// Het formulier wordt verstuurd via Netlify Forms (zie data-netlify hieronder).
// Netlify vindt het formulier in de vooraf gegenereerde HTML van /reservatie/.
// Meldingen per e-mail stelt u in op Netlify: Forms > bestelling > Notifications.
const MAX_BESTAND = 8 * 1024 * 1024; // limiet van Netlify Forms

const LEVERING = [
  { id: "afhalen", title: "Afhalen in de apotheek", sub: "Wij laten u weten wanneer het klaarligt." },
  { id: "thuis",   title: "Bezorgen aan huis",      sub: "Pervijze, Veurne, Diksmuide en Nieuwpoort." },
];

const ReservatiePage = () => {
  const [form, setForm] = React.useState({ naam: "", telefoon: "", email: "", rid: "", adres: "", opmerkingen: "", levering: "afhalen", bestand: "" });
  const [state, setState] = React.useState({ status: "idle", error: "" }); // idle | busy | ok | err
  const set = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));
  const onFile = (e) => {
    const f = e.target.files[0];
    if (f && f.size > MAX_BESTAND) {
      e.target.value = "";
      setForm((prev) => ({ ...prev, bestand: "" }));
      setState({ status: "err", error: "Dat bestand is groter dan 8 MB. Neem een kleinere foto of breng het voorschrift mee." });
      return;
    }
    setForm((prev) => ({ ...prev, bestand: f ? f.name : "" }));
    if (state.status === "err") setState({ status: "idle", error: "" });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (state.status === "busy") return;
    if (!form.telefoon.trim() && !form.email.trim()) {
      setState({ status: "err", error: "Vul een telefoonnummer of e-mailadres in, zodat we u kunnen bereiken." });
      return;
    }
    if (form.levering === "thuis" && !form.adres.trim()) {
      setState({ status: "err", error: "Vul het adres in waar we mogen leveren." });
      return;
    }
    setState({ status: "busy", error: "" });
    try {
      const res = await fetch("/", { method: "POST", body: new FormData(e.target) });
      if (!res.ok) throw new Error(res.status);
      setState({ status: "ok", error: "" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setState({ status: "err", error: "Versturen lukte niet. Probeer het opnieuw of bel ons op 051 55 52 64." });
    }
  };

  const levering = LEVERING.find((o) => o.id === form.levering);

  return (
    <div className="page">
      <section className="container page-head">
        <div>
          <nav className="breadcrumb" aria-label="Kruimelpad"><span>Apotheek</span> <span aria-hidden="true">/</span> <span aria-current="page">Reservatie</span></nav>
          <h1>Voorschrift<br/>indienen, <em>zonder<br/>rij</em> staan.</h1>
        </div>
        <p className="intro">
          Stuur ons uw voorschrift door en kies of u het komt afhalen of laat bezorgen. Wij nemen contact met u op zodra de bestelling klaar is.
        </p>
      </section>

      <section className="container reserv">
        {state.status === "ok" ? (
          <div className="reserv-form">
            <div className="success-banner" role="status" aria-live="polite">
              <Icon name="check" className="icon-svg" />
              Bedankt{form.naam ? `, ${form.naam}` : ""}. We hebben uw bestelling goed ontvangen.
            </div>
            <p className="form-note">
              We nemen contact met u op {form.telefoon ? "via telefoon" : "via e-mail"} zodra alles klaar is
              {form.levering === "thuis" ? " en spreken dan een leveringsmoment af." : "."} Dringend? Bel ons op <a className="inline" href="tel:+3251555264">051 55 52 64</a>.
            </p>
          </div>
        ) : (
        <form
          className="reserv-form"
          name="bestelling"
          method="POST"
          data-netlify="true"
          netlify-honeypot="bot-field"
          encType="multipart/form-data"
          onSubmit={submit}
        >
          <input type="hidden" name="form-name" value="bestelling" />
          <p className="sr-only"><label>Niet invullen: <input name="bot-field" tabIndex="-1" autoComplete="off" /></label></p>

          <fieldset className="form-step">
            <legend className="mono">Stap 1 — Uw gegevens</legend>
          <div className="field">
            <label htmlFor="f-naam">Naam &amp; voornaam</label>
            <input id="f-naam" name="naam" autoComplete="name" required value={form.naam} onChange={set("naam")} placeholder="Maria De Cock" />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="f-tel">Telefoon</label>
              <input id="f-tel" name="telefoon" type="tel" autoComplete="tel" value={form.telefoon} onChange={set("telefoon")} placeholder="0470 12 34 56" />
            </div>
            <div className="field">
              <label htmlFor="f-mail">E-mail</label>
              <input id="f-mail" name="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} placeholder="maria@email.be" />
            </div>
          </div>
          <p className="form-note">Een telefoonnummer of e-mailadres volstaat.</p>
          </fieldset>

          <fieldset className="form-step">
            <legend className="mono">Stap 2 — Voorschrift</legend>
          <div className="field">
            <label htmlFor="f-rid">RID-code van uw e-voorschrift (optioneel)</label>
            <input id="f-rid" name="rid" value={form.rid} onChange={set("rid")} placeholder="De code onder de streepjescode" autoComplete="off" />
          </div>
          <label className={`upload-zone ${form.bestand ? "has-file" : ""}`}>
            <input type="file" name="voorschrift" className="sr-only" onChange={onFile} accept="image/*,.pdf" />
            <div className="upload-icon">
              <Icon name={form.bestand ? "check" : "upload"} className="icon-svg" />
            </div>
            <div>
              <strong>{form.bestand ? form.bestand : "Of voeg een foto van uw voorschrift toe."}</strong>
              <span className="hint">Foto of PDF · max 8 MB · of breng het voorschrift mee bij afhaling.</span>
            </div>
          </label>
          <div className="field">
            <label htmlFor="f-notes">Opmerkingen voor de apotheker</label>
            <textarea id="f-notes" name="opmerkingen" value={form.opmerkingen} onChange={set("opmerkingen")} rows={3} placeholder="Bv. allergie voor penicilline, liefst generiek, ..." />
          </div>
          </fieldset>

          <fieldset className="form-step">
            <legend className="mono">Stap 3 — Afhalen of bezorgen</legend>
          <div className="delivery-options">
            {LEVERING.map((o) => (
              <label key={o.id} className={`delivery-option ${form.levering === o.id ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="levering"
                  value={o.title}
                  className="sr-only"
                  checked={form.levering === o.id}
                  onChange={() => setForm((prev) => ({ ...prev, levering: o.id }))}
                />
                <span className="radio" aria-hidden="true"></span>
                <span className="title">
                  {o.title}
                  <small>{o.sub}</small>
                </span>
                <span className="when"></span>
              </label>
            ))}
          </div>
          {form.levering === "thuis" ? (
            <div className="field">
              <label htmlFor="f-adres">Leveradres</label>
              <input id="f-adres" name="adres" autoComplete="street-address" value={form.adres} onChange={set("adres")} placeholder="Straat, nummer, gemeente" />
            </div>
          ) : null}
          </fieldset>

          {state.status === "err" ? <p className="form-error" role="alert">{state.error}</p> : null}

          <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start", marginTop: 12 }} disabled={state.status === "busy"}>
            {state.status === "busy" ? "Bezig met versturen…" : "Bestelling versturen"}
            <span className="arr" aria-hidden="true"></span>
          </button>
        </form>
        )}

        <aside className="reserv-aside">
          <h2>Uw <em>bestelling</em></h2>
          <dl style={{ margin: 0 }}>
            <div className="summary-row">
              <dt>Naam</dt>
              <dd>{form.naam || <em>nog in te vullen</em>}</dd>
            </div>
            <div className="summary-row">
              <dt>Voorschrift</dt>
              <dd>{form.bestand || form.rid || <em>nog niet toegevoegd</em>}</dd>
            </div>
            <div className="summary-row">
              <dt>Levering</dt>
              <dd>{levering ? levering.title : null}</dd>
            </div>
          </dl>
          <section className="aside-block">
            <h3 className="mono">Openingsuren</h3>
            <dl className="aside-hours">
              <dt>Ma di do vr</dt>
              <dd>08:30–12:00 · 14:00–19:00</dd>
              <dt>Woensdag</dt>
              <dd>08:30–12:00 <em>· namiddag gesloten</em></dd>
              <dt>Zaterdag</dt>
              <dd>08:30–12:00</dd>
              <dt>Zondag</dt>
              <dd><em>gesloten</em></dd>
            </dl>
          </section>
          <section className="aside-block aside-note">
            <h3>Vertrouwelijk</h3>
            <p>Uw gegevens en voorschrift worden enkel door onze apothekers ingezien. U hebt geen account nodig.</p>
          </section>
        </aside>
      </section>
    </div>
  );
};

// ============ LINKS ============
const LINK_GROUPS = [
  {
    group: "Geneesmiddelen",
    items: [
      { domain: "bcfi.be",         title: <>Belgisch Centrum voor <em>Farmacotherapeutische informatie</em></>, desc: "De referentie in België voor onafhankelijke geneesmiddeleninformatie." },
      { domain: "cybele.be",       title: <>Zwangerschap &amp; <em>borstvoeding</em></>,                       desc: "Wat mag wel, wat niet — betrouwbare info over geneesmiddelen tijdens zwangerschap en borstvoeding." },
      { domain: "sensoa.be",       title: <>Contraceptie (<em>de pil</em>)</>,                                  desc: "Heldere uitleg over alle vormen van anticonceptie en seksuele gezondheid." },
      { domain: "vaxxin.be",       title: <>Vaccin<em>aties</em></>,                                            desc: "Praktische info over het Belgische vaccinatieschema en aanbevolen vaccins." },
    ],
  },
  {
    group: "Gezondheid",
    items: [
      { domain: "diabetes.be",          title: <>Diabetes<em>liga</em></>,                  desc: "Patiëntenvereniging met info, contactgegevens en lotgenotengroepen." },
      { domain: "hartenvaatziekten.be", title: <>Hart- &amp; <em>vaatziekten</em></>,        desc: "Belgische Cardiologische Liga — preventie, herkennen, leven met." },
      { domain: "kanker.be",            title: <>Stichting tegen <em>kanker</em></>,         desc: "Informatie, ondersteuning en de Tabakstoplijn 0800 111 00." },
      { domain: "antigifcentrum.be",    title: <>Antigif<em>centrum</em></>,                 desc: "070 245 245 — 24/7 bereikbaar voor vragen over vergiftiging." },
      { domain: "kindengezin.be",       title: <>Kind &amp; <em>Gezin</em></>,                desc: "Voor alle vragen over de eerste levensjaren — voeding, slaap, vaccinatie." },
      { domain: "brandwonden.be",       title: <>Eerste hulp bij <em>brandwonden</em></>,    desc: "Stichting Brandwonden — wat te doen, en wanneer naar de spoed." },
    ],
  },
  {
    group: "Sport &amp; reizen",
    items: [
      { domain: "itg.be/nl",         title: <>Reis<em>vaccinaties</em></>,         desc: "Instituut voor Tropische Geneeskunde — welke vaccinaties u nodig hebt per bestemming, plus malariaprofylaxe." },
      { domain: "dopinglijn.be",     title: <>Doping<em>lijn</em></>,              desc: "Check vóór gebruik of een geneesmiddel op de dopinglijst staat." },
    ],
  },
];

const LinksPage = () => (
  <div className="page">
    <section className="container page-head">
      <div>
        <nav className="breadcrumb" aria-label="Kruimelpad"><span>Apotheek</span> <span aria-hidden="true">/</span> <span aria-current="page">Nuttige links</span></nav>
        <h1>Waar wij <em>zelf</em><br/>naar verwijzen.</h1>
      </div>
      <p className="intro">
        Een gecureerde lijst van Belgische bronnen die wij in de praktijk gebruiken — opgesplitst in geneesmiddelen, gezondheid en reizen.
      </p>
    </section>

    {LINK_GROUPS.map((g, gi) => (
      <section key={gi} className="container section" style={{ paddingTop: gi === 0 ? 64 : 56, paddingBottom: 48, borderBottom: gi === LINK_GROUPS.length - 1 ? "none" : "1px solid var(--rule)" }}>
        <header className="section-head" style={{ marginBottom: 32 }}>
          <span className="num" aria-hidden="true"></span>
          <h2 dangerouslySetInnerHTML={{ __html: g.group }} />
          <span></span>
        </header>
        <ul className="links-grid">
          {g.items.map((l, i) => (
            <li key={i}><a className="link-card" href={`https://${l.domain.replace(/\s/g, '')}`} target="_blank" rel="noreferrer">
              <span className="domain">↗ {l.domain}</span>
              <h3>{l.title}</h3>
              <p>{l.desc}</p>
              <span className="visit">Bezoek site <span className="sr-only">(opent in nieuw venster)</span>→</span>
            </a></li>
          ))}
        </ul>
      </section>
    ))}
  </div>
);

// ============ INFO ============
const PHARMACY_COORDS = [51.0938, 2.7869];

// Leaflet wordt enkel geladen als de kaart echt op het scherm komt.
let leafletBelofte = null;
const laadLeaflet = () => {
  if (typeof window !== "undefined" && window.L) return Promise.resolve(window.L);
  if (leafletBelofte) return leafletBelofte;
  leafletBelofte = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    css.integrity = "sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H";
    css.crossOrigin = "anonymous";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    js.integrity = "sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH";
    js.crossOrigin = "anonymous";
    js.onload = () => resolve(window.L);
    js.onerror = () => { leafletBelofte = null; reject(new Error("leaflet")); };
    document.head.appendChild(js);
  });
  return leafletBelofte;
};

const PervijzeMap = () => {
  const ref = React.useRef(null);

  React.useEffect(() => {
    let map = null;
    let ro = null;
    let weg = false;
    laadLeaflet().then((L) => {
    if (weg || !ref.current) return;
    map = L.map(ref.current, {
      center: PHARMACY_COORDS,
      zoom: 16,
      scrollWheelZoom: false,
      zoomControl: true,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    L.marker(PHARMACY_COORDS, {
      icon: L.divIcon({
        className: "",
        html: '<div class="map-marker"></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      }),
      title: "Apotheek Vansuyt",
      alt: "Apotheek Vansuyt, Nieuwpoortstraat 29, Pervijze",
    })
      .addTo(map)
      .bindPopup("<strong>Apotheek Vansuyt</strong><br/>Nieuwpoortstraat 29<br/>8600 Pervijze");

    // Click to enable wheel zoom — avoids hijacking page scroll
    map.on("click", () => map.scrollWheelZoom.enable());
    map.on("mouseout", () => map.scrollWheelZoom.disable());

    ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(ref.current);
    }).catch(() => { /* zonder kaart blijft de routelink werken */ });

    return () => { weg = true; if (ro) ro.disconnect(); if (map) map.remove(); };
  }, []);

  return (
    <div className="map-block">
      <div className="map-canvas" ref={ref} role="application" aria-label="Kaart met de ligging van Apotheek Vansuyt in Pervijze"></div>
      <div className="map-actions">
        <a href={MAPS_URL} target="_blank" rel="noreferrer">Routebeschrijving <span className="sr-only">(opent in Google Maps)</span>→</a>
      </div>
    </div>
  );
};

const InfoPage = () => (
  <div className="page">
    <section className="container page-head">
      <div>
        <nav className="breadcrumb" aria-label="Kruimelpad"><span>Apotheek</span> <span aria-hidden="true">/</span> <span aria-current="page">Contact</span></nav>
        <h1>Langs<em>komen,</em><br/>bellen of mailen.</h1>
      </div>
      <p className="intro">
        We zijn drie minuten van de Pervijzedijk en hebben gratis parking voor de deur. Buiten de openingsuren: apotheek van wacht via apotheek.be of 0903 99 000.
      </p>
    </section>

    <section className="container section">
      <div className="info-grid">
        <PervijzeMap />

        <div className="info-detail">
          <dl>
            <div className="info-row">
              <dt>Naam</dt>
              <dd>Apotheek Vansuyt S.</dd>
            </div>
            <div className="info-row">
              <dt>Adres</dt>
              <dd><address>Nieuwpoortstraat 29<br/><em>8600 Pervijze (België)</em></address></dd>
            </div>
            <div className="info-row">
              <dt>Telefoon</dt>
              <dd><a className="mono-val" href="tel:+3251555264">051 55 52 64</a></dd>
            </div>
            <div className="info-row">
              <dt>E-mail</dt>
              <dd><a className="mono-val" href="mailto:vansuytapotheek@gmail.com">vansuytapotheek@gmail.com</a></dd>
            </div>
            <div className="info-row">
              <dt>BTW</dt>
              <dd className="mono-val">BE0 668 344 450</dd>
            </div>
            <div className="info-row">
              <dt>Titularis</dt>
              <dd>Apr. Vansuyt Sabine</dd>
            </div>
            <div className="info-row">
              <dt>Parking</dt>
              <dd>Gratis voor de deur</dd>
            </div>
            <div className="info-row">
              <dt>Toegankelijk</dt>
              <dd>Rolstoeltoegankelijk · drempelvrije ingang</dd>
            </div>
          </dl>

          <aside className="callout">
            <span className="mono">Buiten openingsuren</span>
            <h3>Wachtdienst &amp; spoed</h3>
            <p>Zoek de apotheek van wacht via <a className="inline" href="https://www.apotheek.be/pharmacysearch" target="_blank" rel="noreferrer">apotheek.be</a> of bel <a className="inline" href="tel:090399000">0903 99 000</a>. Huisarts van wacht: <a className="inline" href="tel:1733">1733</a>. Bij levensgevaar: <a className="inline" href="tel:112">112</a>. De code voor farmaceutische plichtenleer kan u nalezen bij de <a className="inline" href="https://www.ordredespharmaciens.be/nl" target="_blank" rel="noreferrer">Belgische Orde van Apothekers</a>.</p>
          </aside>
        </div>
      </div>
    </section>
  </div>
);

export { ReservatiePage, LinksPage, InfoPage, PervijzeMap };
