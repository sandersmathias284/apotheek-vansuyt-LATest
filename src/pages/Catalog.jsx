// Producten + Diensten
import React from "react";
import { createPortal } from "react-dom";
import { hrefOf } from "../routes.js";

const PRODUCTS = [
  { cat: "huid", brand: "La Roche-Posay", name: "Lipikar Baume AP+M", desc: "Verzachtende balsem voor zeer droge, atopische huid.", price: "€ 18,90", badge: "Advies van Sabine", bg: 1 },
  { cat: "natuur", brand: "Pranarôm", name: "Aromaforce neusspray", desc: "Etherische oliën bij verstopte neus, zonder rebound-effect.", price: "€ 9,40", bg: 2 },
  { cat: "vita", brand: "D-Cure", name: "Vitamine D₃ 25 000 IE", desc: "Op voorschrift. Dagelijks of wekelijks schema, in overleg.", price: "€ 6,80", bg: 4 },
  { cat: "natuur", brand: "Phytostandard", name: "Valeriaan + Eschscholzia", desc: "Plantextract voor inslapen, zonder gewenning.", price: "€ 22,00", bg: 1 },
  { cat: "huid", brand: "Avène", name: "Cicalfate+ herstelcrème", desc: "Voor schaafwonden, irritatie en na ingrepen. Voor het hele gezin.", price: "€ 14,70", bg: 2 },
  { cat: "vita", brand: "Bional", name: "Magnesium bisglycinaat", desc: "Goed opneembare vorm. Bij vermoeidheid en spierkrampen.", price: "€ 19,90", bg: 3 },
  { cat: "natuur", brand: "Pranarôm", name: "HE Lavendel fijn — bio", desc: "Essentiële olie van Lavandula angustifolia. Bij stress en kleine brandwondjes.", price: "€ 11,80", bg: 1 },
  { cat: "huid", brand: "Bioderma", name: "Sensibio H₂O micellair", desc: "Reinigt en verwijdert make-up zonder de huidbarrière aan te tasten.", price: "€ 13,50", bg: 2 },
  { cat: "eco", brand: "Vansuyt", name: "Herbruikbaar verbandtasje", desc: "Linnen tasje, in eigen apotheek gemaakt. Gratis bij elke bestelling > € 25.", price: "€ 0,00", badge: "Huismerk", bg: 3 },
  { cat: "vita", brand: "Be-Life", name: "Omega-3 EPA/DHA", desc: "Geconcentreerde visolie, IFOS-gecertificeerd. Voor hart en zicht.", price: "€ 28,40", bg: 4 },
];

const PRODUCT_CATS = [
  { id: "all",    name: "Alle" },
  { id: "huid",   name: "Huidverzorging" },
  { id: "vita",   name: "Vitamines" },
  { id: "natuur", name: "Fytotherapie" },
  { id: "eco",    name: "Eco &amp; herbruikbaar" },
].map(c => ({
  ...c,
  count: c.id === "all" ? PRODUCTS.length : PRODUCTS.filter(p => p.cat === c.id).length,
}));

const ProductenPage = () => {
  const [cat, setCat] = React.useState("all");
  const filtered = cat === "all" ? PRODUCTS : PRODUCTS.filter(p => p.cat === cat);
  return (
    <div className="page">
      <section className="container page-head">
        <div>
          <nav className="breadcrumb" aria-label="Kruimelpad"><span>Apotheek</span> <span aria-hidden="true">/</span> <span aria-current="page">Producten</span></nav>
          <h1>Een <em>gecureerde</em><br/>selectie.</h1>
        </div>
        <p className="intro">
          Wij verkopen niet wat het mooist verkoopt — wel wat onze apothekers zelf zouden nemen. Twaalf vaste favorieten, plus uw voorschrift op bestelling.
        </p>
      </section>

      <section className="container section" style={{ paddingTop: 48 }}>
        <div className="cat-filters">
          {PRODUCT_CATS.map(c => (
            <button key={c.id} className={`cat-chip ${cat === c.id ? "active" : ""}`} onClick={() => setCat(c.id)}>
              <span dangerouslySetInnerHTML={{ __html: c.name }} /> <span className="count">{c.count}</span>
            </button>
          ))}
        </div>
        <div className="product-grid">
          {filtered.map((p, i) => (
            <div key={i} className="product">
              <div className={`product-img bg-${p.bg}`}>
                {p.badge && <span className="badge">{p.badge}</span>}
                <div className="bottle"></div>
              </div>
              <div className="meta">
                <span>{p.brand}</span>
                <span>{p.cat.toUpperCase()}</span>
              </div>
              <h4>{p.name}</h4>
              <p className="desc">{p.desc}</p>
              <div className="price">{p.price}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

// ============ DIENSTEN ============
const VACC_STORE_KEY = "vansuyt.vaccAgenda.v1";

const STATUS_LABEL = {
  vrij: "Plaatsen vrij",
  beperkt: "Enkele plaatsen vrij",
  volzet: "Volzet",
};

const VACC_CAMPAIGNS = [
  {
    id: "covid",
    kicker: "Najaarscampagne 2026",
    title: <>Covid-<em>vaccinatie</em></>,
    lede: "Wij vaccineren op vaste dagen — zie de beschikbare data hieronder. Een afspraak is noodzakelijk. Gratis voor iedereen uit de doelgroepen: 65+, zwangere vrouwen, chronisch zieken, zorgpersoneel en wie samenwoont met een kwetsbare persoon. Breng uw identiteitskaart mee.",
    // Covid: we tonen enkel of er nog plaats is, geen aantallen
    allowed: ["beperkt", "volzet"],
    slots: [],
    tags: ["Afspraak noodzakelijk", "Vaste dagen", "Gratis voor doelgroepen", "ID-kaart mee"],
  },
  {
    id: "griep",
    kicker: "Najaarscampagne 2026",
    title: <>Griep<em>vaccinatie</em></>,
    lede: "Op zaterdag. Andere dagen zijn mogelijk mits voorafgaandelijke afspraak. Personen vanaf 50 jaar kunnen hun griepvaccin bij ons laten zetten zonder voorafgaand doktersvoorschrift; vanaf 65 jaar is het terugbetaald.",
    allowed: ["vrij", "beperkt", "volzet"],
    info: [
      {
        h: "Prijs &amp; terugbetaling",
        p: "Vanaf 65 jaar is het griepvaccin terugbetaald. Niet-risicogroepen betalen de volledige prijs bij de apotheek (ca. € 17,50). Sommige ziekenfondsen bieden via hun aanvullende verzekering wel een jaarlijkse tegemoetkoming voor vaccins van € 15 tot € 25.",
      },
      {
        h: "Mogelijke, maar zeldzame bijwerkingen",
        p: "Allergie: een heftige allergische reactie komt heel soms voor, bijvoorbeeld bij mensen met een ernstige allergie voor kippeneiwit.",
      },
      {
        h: "Misvattingen",
        list: [
          "U kunt geen griep krijgen van de prik zelf, omdat het vaccin dode virussen bevat.",
          "De prik voorkomt griep niet voor 100%. Maar krijgt u de griep desondanks toch, dan zijn de klachten vaak wel milder.",
        ],
      },
      {
        h: "Waarom jaarlijks herhalen?",
        p: "Het griepvirus verandert elk jaar, dus u moet de prik ieder jaar opnieuw halen.",
      },
    ],
    slots: [],
    tags: ["Op zaterdag", "Andere dagen op afspraak", "Vanaf 50 jaar zonder voorschrift", "Terugbetaald vanaf 65 jaar"],
  },
];

// Vaccinatiedagen komen rechtstreeks uit de online agenda van de apotheek:
// Sabine duidt ze aan op de tablet (Beheer > Vaccinatiedagen). Vrije uren en
// volzette dagen volgen vanzelf uit de boekingen.
const VACC_API = "https://apotheekformulier.netlify.app/.netlify/functions/boeken?actie=dagen";
const readVacc = () => { try { return JSON.parse(localStorage.getItem(VACC_STORE_KEY)) || {}; } catch { return {}; } };
const cacheVacc = (next) => {
  try { localStorage.setItem(VACC_STORE_KEY, JSON.stringify(next)); } catch {}
  window.dispatchEvent(new CustomEvent("vansuyt:vacc"));
  return next;
};
// Covid toont enkel of er nog plaats is (beperkt/volzet), griep ook "vrij".
// plaatsen = wat nog geboekt kan worden (vrije momenten, begrensd door het dagmaximum).
const vaccPlaatsen = (d) => (d.plaatsen != null ? d.plaatsen : d.vrij.length);
const vaccStatus = (id, d) =>
  vaccPlaatsen(d) === 0 ? "volzet" : (id === "covid" || vaccPlaatsen(d) <= 3) ? "beperkt" : "vrij";
const vaccDatum = (lang) => (lang.charAt(0).toUpperCase() + lang.slice(1)).replace(/ \d{4}$/, "");
const naarVaccStore = (dagen) => {
  const store = {};
  VACC_CAMPAIGNS.forEach((c) => {
    store[c.id] = {
      slots: dagen
        .filter((d) => Array.isArray(d.vaccins) && d.vaccins.indexOf(c.id) !== -1)
        .map((d) => ({
          id: `${c.id}-${d.datum}`,
          date: vaccDatum(d.lang),
          time: (d.blokken || []).map((b) => `${b.van} – ${b.tot}`).join(", "),
          status: vaccStatus(c.id, d),
        })),
    };
  });
  return store;
};
const fetchVacc = async () => {
  try {
    const res = await fetch(`${VACC_API}&t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    if (!data.ok) throw new Error(data.fout);
    return cacheVacc(naarVaccStore(data.dagen || []));
  } catch { return readVacc(); }
};
const pushVacc = async () => {
  fetchVacc();
  return { ok: false, error: "De vaccinatiedata komen nu uit de tablet van de apotheek (Beheer > Vaccinatiedagen). Pas ze daar aan; wijzigingen hier worden niet bewaard." };
};
const useVacc = () => {
  const [store, setStore] = React.useState(readVacc);
  React.useEffect(() => {
    const sync = () => setStore(readVacc());
    window.addEventListener("vansuyt:vacc", sync);
    fetchVacc();
    const onVis = () => { if (!document.hidden) fetchVacc(); };
    document.addEventListener("visibilitychange", onVis);
    const iv = setInterval(fetchVacc, 300000);
    return () => { window.removeEventListener("vansuyt:vacc", sync); document.removeEventListener("visibilitychange", onVis); clearInterval(iv); };
  }, []);
  return store;
};

// beheer=true enkel op de beveiligde beheerpagina; onSave krijgt de nieuwe store
// Boekingsvenster: de boekingspagina van de apotheek, ingesloten in de huisstijl.
const BoekVenster = ({ vaccin, onClose }) => {
  const camp = VACC_CAMPAIGNS.find((c) => c.id === vaccin);
  React.useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    const vorige = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = vorige; };
  }, []);
  // Via een portal rechtstreeks in <body>, zodat geen enkele pagina-animatie het venster verschuift.
  return createPortal(
    <div className="boek-scrim" onClick={onClose}>
      <div className="boek-venster" role="dialog" aria-modal="true" aria-label={`Plaats reserveren — ${vaccin === "covid" ? "covidvaccinatie" : "griepvaccinatie"}`} onClick={(e) => e.stopPropagation()}>
        <div className="boek-kop">
          <div>
            <span className="mono">Plaats reserveren</span>
            <h3>{camp ? camp.title : null}</h3>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Venster sluiten">×</button>
        </div>
        <iframe className="boek-frame" src={`https://apotheekformulier.netlify.app/boeken.html?embed=1&vaccin=${vaccin}`} title="Vaccinatie reserveren"></iframe>
      </div>
      <style>{`
        .boek-scrim { position: fixed; inset: 0; z-index: 200; background: rgba(36,28,24,.55); display: flex; align-items: center; justify-content: center; padding: 24px; }
        .boek-venster { background: var(--paper); border: 1px solid var(--rule); border-radius: var(--radius); width: min(720px, 100%); height: min(860px, 100%); display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 60px rgba(36,28,24,.25); }
        .boek-kop { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 18px 22px 14px; border-bottom: 1px solid var(--rule-soft); }
        .boek-kop .mono { color: var(--red); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
        .boek-kop h3 { font-family: var(--serif); font-weight: 400; font-size: 26px; margin-top: 4px; }
        .boek-kop h3 em { color: var(--red); }
        .boek-frame { flex: 1; width: 100%; border: 0; background: var(--paper); }
        @media (max-width: 600px) { .boek-scrim { padding: 0; } .boek-venster { height: 100%; border: 0; border-radius: 0; } }
      `}</style>
    </div>,
    document.body
  );
};

const VaccinatieAgenda = ({ beheer = false, onSave }) => {
  const store = useVacc();
  const [boekVaccin, setBoekVaccin] = React.useState(null);
  // Na het sluiten de data opnieuw ophalen: een volzette dag toont dan meteen "Volzet".
  const sluitBoeking = () => { setBoekVaccin(null); fetchVacc(); };
  const persist = (next) => { cacheVacc(next); if (onSave) onSave(next); };

  // Merge defaults with saved edits: saved slot list wins if present
  const slotsFor = (c) => {
    const saved = store[c.id];
    if (saved && Array.isArray(saved.slots)) return saved.slots;
    return c.slots;
  };

  const writeSlots = (c, slots) => persist({ ...store, [c.id]: { slots } });

  const cycle = (c, slot) => {
    const list = c.allowed;
    const next = list[(list.indexOf(slot.status) + 1) % list.length];
    writeSlots(c, slotsFor(c).map(s => s.id === slot.id ? { ...s, status: next } : s));
  };

  const editField = (c, slot, key, value) => {
    writeSlots(c, slotsFor(c).map(s => s.id === slot.id ? { ...s, [key]: value } : s));
  };

  const addSlot = (c) => {
    const slots = slotsFor(c);
    writeSlots(c, [...slots, {
      id: `${c.id}-${Date.now()}`,
      date: "Nieuwe datum",
      time: "09:00 – 12:00",
      status: c.allowed[0],
    }]);
  };

  const removeSlot = (c, slot) => {
    writeSlots(c, slotsFor(c).filter(s => s.id !== slot.id));
  };

  const moveSlot = (c, slot, dir) => {
    const slots = [...slotsFor(c)];
    const i = slots.findIndex(s => s.id === slot.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= slots.length) return;
    [slots[i], slots[j]] = [slots[j], slots[i]];
    writeSlots(c, slots);
  };

  const resetCampaign = (c) => {
    const next = { ...store };
    delete next[c.id];
    persist(next);
  };

  const resetAll = () => persist({});

  return (
    <section className={`${beheer ? "" : "container section "}vacc-section`} id={beheer ? undefined : "vaccinaties"}>
      {beheer ? null : (
      <header className="section-head">
        <span className="num">Vaccinaties — agenda</span>
        <h2>Covid &amp; griep, <em>bij ons</em> gezet.</h2>
        <p className="right">
          Wij vaccineren op vaste dagen in de apotheek en een afspraak is noodzakelijk. Bel <a className="inline" href="tel:+3251555264">051 55 52 64</a> of
          spring binnen om een plaats te reserveren.
        </p>
      </header>
      )}

      <div className="vacc-grid">
        {VACC_CAMPAIGNS.map((c) => {
          const slots = slotsFor(c);
          const vrijeSlots = slots.filter(s => s.status !== "volzet").length;
          const edited = !!store[c.id];
          return (
            <article key={c.id} className={`vacc-card vacc-${c.id} ${beheer ? "in-beheer" : ""}`}>
              <header className="vacc-card-head">
                <span className="mono">{c.kicker}</span>
                <h3>{c.title}</h3>
                <p>{c.lede}</p>
                <ul className="tags">
                  {c.tags.map((t, i) => <li key={i} dangerouslySetInnerHTML={{ __html: t }} />)}
                </ul>
              </header>

              <div className="vacc-dates">
                <div className="vacc-dates-head">
                  <span className="mono">Data</span>
                  <span className="mono vacc-count" role="status">
                    {slots.length === 0
                      ? "Nog geen data ingevuld"
                      : vrijeSlots === 0
                        ? "Alle data volzet"
                        : `${vrijeSlots} van ${slots.length} data nog vrij`}
                  </span>
                </div>

                {slots.length === 0 && !beheer && (
                  <p className="vacc-empty">De data voor deze campagne worden binnenkort bekendgemaakt. Bel ons voor meer info.</p>
                )}

                <ul className="vacc-list">
                  {slots.map((s, i) => (
                    <li key={s.id} className={`vacc-row st-${s.status} ${beheer ? "editing" : ""}`}>
                      {beheer ? (
                        <>
                          <div className="vacc-when edit">
                            <input
                              className="vacc-in vacc-in-date"
                              value={s.date}
                              onChange={(e) => editField(c, s, "date", e.target.value)}
                              aria-label="Datum"
                              placeholder="Bv. Zaterdag 10 oktober"
                            />
                            <input
                              className="vacc-in vacc-in-time"
                              value={s.time}
                              onChange={(e) => editField(c, s, "time", e.target.value)}
                              aria-label="Uur"
                              placeholder="09:00 – 12:00"
                            />
                          </div>
                          <div className="vacc-row-tools">
                            <button
                              type="button"
                              className={`vacc-status editable st-${s.status}`}
                              onClick={() => cycle(c, s)}
                              aria-label={`Status wijzigen — nu ${STATUS_LABEL[s.status]}`}
                            >
                              {STATUS_LABEL[s.status]}
                              <span className="vacc-cyc" aria-hidden="true">↻</span>
                            </button>
                            <div className="vacc-move">
                              <button type="button" onClick={() => moveSlot(c, s, -1)} disabled={i === 0} aria-label="Naar boven">↑</button>
                              <button type="button" onClick={() => moveSlot(c, s, 1)} disabled={i === slots.length - 1} aria-label="Naar onder">↓</button>
                            </div>
                            <button type="button" className="vacc-del" onClick={() => removeSlot(c, s)} aria-label="Datum verwijderen">×</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="vacc-when">
                            <strong>{s.date}</strong>
                            <span>{s.time}</span>
                          </div>
                          <span className={`vacc-status st-${s.status}`}>{STATUS_LABEL[s.status]}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>

                {beheer && (
                  <div className="vacc-edit-actions">
                    <button type="button" className="vacc-add" onClick={() => addSlot(c)}>+ Datum toevoegen</button>
                    {edited && (
                      <button type="button" className="vacc-reset" onClick={() => resetCampaign(c)}>Terugzetten</button>
                    )}
                  </div>
                )}

                {!beheer && (
                  <div className="vacc-actions">
                    <a className="btn btn-primary" href={`https://apotheekformulier.netlify.app/boeken.html?vaccin=${c.id}`} target="_blank" rel="noreferrer"
                      onClick={(e) => { e.preventDefault(); setBoekVaccin(c.id); }}>
                      Plaats reserveren<span className="arr" aria-hidden="true"></span>
                    </a>
                    <a className="btn btn-ghost" href="mailto:vansuytapotheek@gmail.com?subject=Vaccinatie%20reserveren">
                      Mail ons
                    </a>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {!beheer && VACC_CAMPAIGNS.filter(c => c.info).map((c) => (
        <section className="vacc-know" key={`k-${c.id}`} aria-labelledby={`know-${c.id}`}>
          <h3 className="mono" id={`know-${c.id}`}>Goed om te weten — griepvaccinatie</h3>
          <div className="vacc-know-grid">
            {c.info.map((b, i) => (
              <article className="vacc-info-block" key={i}>
                <h4 dangerouslySetInnerHTML={{ __html: b.h }} />
                {b.p ? <p>{b.p}</p> : null}
                {b.list ? <ul>{b.list.map((li, j) => <li key={j}>{li}</li>)}</ul> : null}
              </article>
            ))}
          </div>
        </section>
      ))}

      {beheer ? (
        <div className="vacc-admin">
          <p className="vacc-admin-hint">
            Pas datum en uur aan in de velden, tik op de status om te wisselen
            (<em>{Object.values(STATUS_LABEL).join(" → ")}</em>), gebruik ↑↓ om te herschikken en × om te verwijderen.
            Elke wijziging wordt meteen centraal bewaard.
          </p>
          <button type="button" className="vacc-reset" onClick={resetAll}>Alles terugzetten naar standaard</button>
        </div>
      ) : null}

      {boekVaccin ? <BoekVenster vaccin={boekVaccin} onClose={sluitBoeking} /> : null}
    </section>
  );
};

const DIENSTEN = [
  {
    act: { label: "Naar de data", anchor: "vaccinaties" },
    title: <>Covid-<em>vaccinatie</em></>,
    desc: "Wij vaccineren op vaste dagen tijdens de najaarscampagne — een afspraak is noodzakelijk. Gratis voor de doelgroepen. De beschikbare data staan hieronder.",
    tags: ["Afspraak noodzakelijk", "Vaste dagen", "Doelgroepen gratis"],
  },
  {
    act: { label: "Naar de data", anchor: "vaccinaties" },
    title: <>Griep<em>vaccinatie</em></>,
    desc: "Op zaterdag; andere dagen mogelijk mits voorafgaandelijke afspraak. Vanaf 50 jaar zonder voorafgaand doktersvoorschrift, vanaf 65 jaar terugbetaald; niet-risicogroepen betalen ca. € 17,50. Het griepvirus verandert elk jaar, dus de prik moet jaarlijks herhaald worden.",
    tags: ["Op zaterdag", "Andere dagen op afspraak", "Vanaf 50 jaar zonder voorschrift"],
  },
  {
    act: { label: "Bestelling plaatsen", page: "reservatie" },
    title: <>Thuis<em>levering</em></>,
    desc: "Wij brengen uw medicatie discreet, betrouwbaar en op tijd bij u thuis. Bestel telefonisch of via het reservatieformulier en vermeld dat u thuislevering wenst.",
    tags: ["Discreet", "Geen drempelbedrag", "Pervijze &amp; omstreken"],
  },
  {
    act: { label: "Afspraak maken", href: "tel:+3251555264" },
    title: <>Inname-<em>begeleiding</em></>,
    desc: "Persoonlijke uitleg over de correcte inname van uw medicatie, mogelijke wisselwerkingen en aandachtspunten — op maat van uw situatie en uw schema.",
    tags: ["Persoonlijk", "Wisselwerkingen", "Op afspraak"],
  },
  {
    act: { label: "Bel ons", href: "tel:+3251555264" },
    title: <>Attest<em>beheer</em></>,
    desc: "Wij helpen u met het beheer van ziekte- en terugbetalingsattesten zodat u zeker bent dat alles in orde is bij uw mutualiteit en arts.",
    tags: ["Terugbetaling", "Mutualiteit", "Voor u geregeld"],
  },
  {
    act: { label: "Sorteerwijzer", page: "sorteerwijzer" },
    title: <>Inzameling vervallen <em>geneesmiddelen</em></>,
    desc: "Breng uw vervallen of ongebruikte geneesmiddelen binnen voor veilige en milieuvriendelijke inzameling. Geen vragen, geen kosten. Onze sorteerwijzer toont wat u wel en niet meebrengt.",
    tags: ["Gratis", "Milieu", "Iedereen welkom"],
  },
  {
    act: { label: "Kom langs", page: "info" },
    title: <>Eerlijk <em>advies</em></>,
    desc: "Twijfelt u over een product, een nevenwerking of een nieuwe klacht? Vraag het ons gerust — wij geven advies zonder verplichting tot aankoop.",
    tags: ["Vrijblijvend", "Zonder verplichting", "Komt u langs"],
  },
  {
    act: { label: "Bel ons", href: "tel:+3251555264" },
    title: <>Verhuur &amp; verkoop <em>thuiszorgmateriaal</em></>,
    desc: "Krukken, looprek, toiletverhoger en incontinentiemateriaal — aan terugbetaalde prijs. Kom langs voor maat, gewicht en voorwaarden.",
    tags: ["Terugbetaling", "Incontinentie", "Mobiliteit"],
  },
  {
    act: { label: "Vraag advies", href: "tel:+3251555264" },
    title: <>Fyto-, homeo- &amp; <em>aromazorg</em></>,
    desc: "Plantextracten, homeopathische middelen en essentiële oliën — afgestemd op uw klacht door een geschoolde apotheker, naast (of bij) klassieke medicatie.",
    tags: ["Plant", "Homeopathie", "Op maat"],
  },
];

const scrollToId = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: "smooth" });
};

const DienstAction = ({ act, setPage }) => {
  const icon = (
    <span className="dienst-arrow" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </span>
  );
  if (act.href) return <a className="dienst-act" href={act.href}><span>{act.label}</span>{icon}</a>;
  if (act.anchor) return <a className="dienst-act" href={`#${act.anchor}`} onClick={(e) => { e.preventDefault(); scrollToId(act.anchor); }}><span>{act.label}</span>{icon}</a>;
  return <a className="dienst-act" href={hrefOf(act.page)} onClick={(e) => { e.preventDefault(); setPage && setPage(act.page); }}><span>{act.label}</span>{icon}</a>;
};

const DienstenPage = ({ setPage }) => (
  <div className="page">
    <section className="container page-head">
      <div>
        <nav className="breadcrumb" aria-label="Kruimelpad"><span>Apotheek</span> <span aria-hidden="true">/</span> <span aria-current="page">Diensten</span></nav>
        <h1>Zorg <em>op</em> maat,<br/>niet aan de lopende band.</h1>
      </div>
      <p className="intro">
        Onze apothekers nemen extra tijd voor negen diensten die in een typische apotheek vaak ondergesneeuwd raken. Allemaal in eigen huis. De meeste zonder afspraak — vaccinaties op afspraak.
      </p>
    </section>

    <VaccinatieAgenda />

    <section className="container section">
      <div className="dienst-list">
        {DIENSTEN.map((d, i) => (
          <article key={i} className="dienst">
            <span className="ix" aria-hidden="true">{String(i + 1).padStart(2, "0")} / {String(DIENSTEN.length).padStart(2, "0")}</span>
            <div>
              <h3>{d.title}</h3>
              <ul className="tags">
                {d.tags.map((t, j) => <li key={j} dangerouslySetInnerHTML={{ __html: t }} />)}
              </ul>
            </div>
            <p>{d.desc}</p>
            <DienstAction act={d.act} setPage={setPage} />
          </article>
        ))}
      </div>
    </section>
  </div>
);

export { ProductenPage, DienstenPage, VaccinatieAgenda, VACC_CAMPAIGNS, VACC_STORE_KEY, readVacc, cacheVacc, fetchVacc, pushVacc, useVacc };
