// Beheer — beveiligde pagina om sluitingsperiodes te beheren
import React from "react";
import { useNow } from "../lib/hours.js";
import { useClosures, activeClosure, closureOp, writeClosures, pushClosures, fetchClosures, remoteState, checkCode, isoOf, fmtDate, dayStart, useFeestdagOpen, WACHT_URL } from "../components/Closure.jsx";
import { holidayOn, holidaysOf } from "../lib/feestdagen.js";
import { VaccinatieAgenda } from "./Catalog.jsx";
import { hrefOf } from "../routes.js";
import { NIEUWS_API } from "../components/Nieuws.jsx";

const SESSION_KEY = "vansuyt.beheer.sessie";
const CODE_KEY = "vansuyt.beheer.code";

const BeheerPage = ({ setPage }) => {
  const [unlocked, setUnlocked] = React.useState(() => {
    // Zonder de code erbij kan er toch niets bewaard worden: dan vragen we ze
    // opnieuw in plaats van een paneel te tonen waar opslaan mislukt.
    try { return sessionStorage.getItem(SESSION_KEY) === "1" && !!sessionStorage.getItem(CODE_KEY); } catch (e) { return false; }
  });
  const [pin, setPin] = React.useState("");
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const code = pin.trim();
    if (busy) return;
    if (!code) { setErr("Vul de beheercode in."); return; }
    setBusy(true);
    const res = await checkCode(code);
    setBusy(false);
    if (res.ok) {
      sessionStorage.setItem(SESSION_KEY, "1");
      sessionStorage.setItem(CODE_KEY, code);
      setUnlocked(true);
      setErr("");
    } else {
      setErr(res.error);
      setPin("");
    }
  };

  if (!unlocked) {
    return (
      <div className="page">
        <section className="container section beheer-lock-wrap">
          <form className="beheer-lock" onSubmit={submit}>
            <span className="mono">Beheer · enkel voor de apotheker</span>
            <h1>Sluitingsperiodes <em>beheren</em></h1>
            <p>Geef de beheercode in om vakantie- en sluitingsperiodes toe te voegen of aan te passen.</p>
            <label className="bh-field">
              <span>Beheercode</span>
              <input
                type="password"
                name="beheercode"
                autoComplete="current-password"
                value={pin}
                autoFocus
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            {err ? <p className="bh-err" role="alert">{err}</p> : null}
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Controleren…" : "Openen"}<span className="arr" aria-hidden="true"></span></button>
            <a className="bh-back" href={hrefOf("home")} onClick={(e) => { e.preventDefault(); setPage("home"); }}>← Terug naar de website</a>
          </form>
        </section>
      </div>
    );
  }

  return <BeheerPanel setPage={setPage} onLock={() => { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(CODE_KEY); setUnlocked(false); }} />;
};

const emptyDraft = () => {
  const t = new Date();
  return { id: "", from: isoOf(t), to: isoOf(t), reason: "Jaarlijkse vakantie", note: "" };
};

const BeheerPanel = ({ setPage, onLock }) => {
  const [list, setList] = useClosures();
  const now = useNow();
  const [draft, setDraft] = React.useState(emptyDraft);
  const [editing, setEditing] = React.useState(false);
  const [flash, setFlash] = React.useState("");
  const [sync, setSync] = React.useState({ state: "idle", msg: "" });

  const active = activeClosure(now, list);

  const say = (msg) => { setFlash(msg); setTimeout(() => setFlash(""), 2600); };

  // Bewaart centraal via de Netlify-functie
  // Herinnering voor de telefoon (Voys) na het bewaren van een periode.
  const [voysHerinnering, setVoysHerinnering] = React.useState(null);
  // Een nieuw bericht kan een sluitingsvoorstel opleveren. De balk staat
  // bovenaan; bij het berichtenformulier komt dan een regel die erheen wijst.
  const [voorstelRonde, setVoorstelRonde] = React.useState(0);
  const [voorstelWijzer, setVoorstelWijzer] = React.useState("");
  // Nalezen op verzoek: anders wacht ze op het uur van de geplande taak.
  const [herscanRonde, setHerscanRonde] = React.useState(0);

  const commit = async (next, okMsg, periode) => {
    const vorige = list;
    setList(writeClosures(next));
    setSync({ state: "busy", msg: "Centraal bewaren…" });
    const res = await pushClosures(next, sessionStorage.getItem(CODE_KEY) || "", vorige);
    if (res.ok) {
      setSync({ state: "ok", msg: "Centraal bewaard — zichtbaar voor alle bezoekers." });
      say(okMsg);
      fetchClosures();
      setVoysHerinnering({ periode: periode || null, soort: "sluiting" });
    } else {
      setSync({ state: "err", msg: res.error });
    }
  };

  React.useEffect(() => {
    fetchClosures().then(() => {
      setSync(s => (s.state === "idle" && remoteState() === false
        ? { state: "err", msg: "Geen verbinding met de server — wijzigingen blijven voorlopig op dit toestel." }
        : s));
    });
  }, []);

  const save = (e) => {
    e.preventDefault();
    if (!draft.from || !draft.to) return say("Vul een begin- en einddatum in.");
    if (draft.to < draft.from) return say("De einddatum ligt vóór de begindatum.");
    const id = draft.id || `c${Date.now()}`;
    const next = draft.id
      ? list.map(c => (c.id === draft.id ? { ...draft, id } : c))
      : [...list, { ...draft, id }];
    const wasEdit = !!draft.id;
    setDraft(emptyDraft());
    setEditing(false);
    commit(next, wasEdit ? "Periode aangepast." : "Periode toegevoegd.", { ...draft, id });
  };

  const edit = (c) => { setDraft({ ...c }); setEditing(true); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const remove = (c) => {
    if (!window.confirm(`Periode van ${fmtDate(c.from)} tot ${fmtDate(c.to)} verwijderen?`)) return;
    commit(list.filter(x => x.id !== c.id), "Periode verwijderd.");
  };

  const quick = (days, reason) => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + days - 1);
    setDraft({ id: "", from: isoOf(from), to: isoOf(to), reason, note: "" });
    setEditing(true);
  };

  const statusOf = (c) => {
    if (c.to < isoOf(now)) return { k: "past", label: "Voorbij" };
    if (isoOf(now) >= c.from && isoOf(now) <= c.to) return { k: "now", label: "Nu actief" };
    return { k: "future", label: "Gepland" };
  };

  return (
    <div className="page">
      <section className="container section beheer">
        <div className="bh-top">
          <div>
            <span className="mono">Beheer · sluitingsperiodes</span>
            <h1>Vakantie &amp; <em>sluitingen</em></h1>
            <p className="bh-lede">
              Voeg hier een periode toe waarin de apotheek gesloten is. Zodra de periode begint, verandert de onthaalpagina automatisch in een aftelklok naar het heropeningsmoment, met een link naar de apotheek van wacht.
            </p>
          </div>
          <div className="bh-top-actions">
            <a className="btn btn-ghost" href={hrefOf("home")} onClick={(e) => { e.preventDefault(); setPage("home"); }}>Website bekijken</a>
            {/* De server leest de berichten elk uur zelf na; hiermee hoeft ze
                daar niet op te wachten. */}
            <button type="button" className="bh-lock" onClick={() => setHerscanRonde((r) => r + 1)}>Berichten nu nalezen</button>
            <button type="button" className="bh-lock" onClick={onLock}>Vergrendelen</button>
          </div>
        </div>

        <Sluitingsvoorstellen
          ronde={voorstelRonde}
          herscanRonde={herscanRonde}
          closures={list}
          onAanpassen={(v) => {
            // Het bestaande formulier invullen met deze periode, zodat ze de
            // datums of de reden kan verbeteren zonder opnieuw te typen.
            edit({ id: v.closureId || `c${Date.now()}`, from: v.from, to: v.to, reason: v.reason, note: v.note || "" });
          }}
          onNieuw={() => setVoorstelWijzer("Het bericht is gelezen. Kijk bovenaan de pagina wat er met de website gebeurd is.")}
          onToegevoegd={(v, melding, dubbel) => {
            // De server bewaarde de sluiting al: opnieuw ophalen laat de lijst
            // hieronder en de statusbalk op de website meteen volgen.
            fetchClosures();
            say(melding);
            // Ook een open-dag vraagt iets van de telefoon: dan moet de
            // doorschakeling juist uit. Dagen die binnen een eigen sluiting
            // vallen blijven dicht en hoeven niets — valt het hele bereik
            // daarbinnen, dan dus geen herinnering.
            const openDag = v.soort === "open";
            const dagen = openDag ? openDagenZonderSluiting(v).map((h) => h.iso) : [];
            if (!dubbel && (!openDag || dagen.length)) {
              setVoysHerinnering({ periode: { from: v.from, to: v.to }, dagen, soort: openDag ? "open" : "sluiting" });
            }
          }}
        />

        {sync.msg ? (
          <div className={`bh-sync ${sync.state}`} role="status" aria-live="polite">{sync.msg}</div>
        ) : null}

        {voysHerinnering ? <VoysHerinnering {...voysHerinnering} onSluit={() => setVoysHerinnering(null)} /> : null}

        <p className={`bh-state ${active ? "on" : ""}`} role="status">
          <span className="bh-state-dot" aria-hidden="true"></span>
          {active
            ? <span>De website toont nu de <strong>sluitingsmodus</strong> — gesloten tot en met {fmtDate(active.to)}.</span>
            : <span>De website toont nu de <strong>normale openingsuren</strong>. Geen actieve sluiting.</span>}
        </p>

        <div className="bh-grid">
          <form className="bh-form" onSubmit={save}>
            <h2>{draft.id ? "Periode aanpassen" : "Nieuwe periode"}</h2>
            <div className="bh-row">
              <label className="bh-field">
                <span>Van (eerste gesloten dag)</span>
                <input type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} required />
              </label>
              <label className="bh-field">
                <span>Tot en met (laatste gesloten dag)</span>
                <input type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} required />
              </label>
            </div>
            <label className="bh-field">
              <span>Reden (zichtbaar op de website)</span>
              <input type="text" value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder="Jaarlijkse vakantie" />
            </label>
            <label className="bh-field">
              <span>Extra bericht (optioneel)</span>
              <textarea rows="3" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Bv. Bestellingen kunnen vanaf maandag opnieuw afgehaald worden." />
            </label>
            <div className="bh-form-actions">
              <button className="btn btn-primary" type="submit">{draft.id ? "Wijziging bewaren" : "Periode toevoegen"}<span className="arr" aria-hidden="true"></span></button>
              {editing ? <button className="btn btn-ghost" type="button" onClick={() => { setDraft(emptyDraft()); setEditing(false); }}>Annuleren</button> : null}
            </div>
            <fieldset className="bh-quick">
              <legend className="mono-sm">Snel invullen</legend>
              <div>
                <button type="button" onClick={() => quick(1, "Uitzonderlijk gesloten")}>Vandaag</button>
                <button type="button" onClick={() => quick(7, "Jaarlijkse vakantie")}>1 week</button>
                <button type="button" onClick={() => quick(14, "Jaarlijkse vakantie")}>2 weken</button>
                <button type="button" onClick={() => quick(21, "Jaarlijkse vakantie")}>3 weken</button>
              </div>
            </fieldset>
            {flash ? <p className="bh-flash" role="status">{flash}</p> : null}
          </form>

          <div className="bh-list">
            <h2>Ingegeven periodes</h2>
            {list.length === 0 ? (
              <p className="bh-empty">Nog geen sluitingsperiodes ingegeven. De website volgt gewoon de openingsuren.</p>
            ) : (
              <ul>
                {list.map((c) => {
                  const st = statusOf(c);
                  return (
                    <li key={c.id} className={`bh-item ${st.k}`}>
                      <div className="bh-item-main">
                        <span className={`bh-tag ${st.k}`}>{st.label}</span>
                        <p className="bh-item-dates"><time dateTime={c.from}>{fmtDate(c.from)}</time> — <time dateTime={c.to}>{fmtDate(c.to)}</time></p>
                        {c.reason ? <p className="bh-item-reason">{c.reason}</p> : null}
                        {c.note ? <p className="bh-item-note">{c.note}</p> : null}
                      </div>
                      <div className="bh-item-actions">
                        <button type="button" onClick={() => edit(c)}>Aanpassen<span className="sr-only"> — {fmtDate(c.from)} tot {fmtDate(c.to)}</span></button>
                        <button type="button" className="del" onClick={() => remove(c)}>Verwijderen<span className="sr-only"> — {fmtDate(c.from)} tot {fmtDate(c.to)}</span></button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <FeestdagenOpen onKlaar={(m) => say(m)} />
            <aside className="callout" style={{ marginTop: 24 }}>
              <span className="mono">Zo werkt het</span>
              <h3>Automatisch aan en uit</h3>
              <p>Op de eerste gesloten dag schakelt de website zelf over: bovenaan verschijnt een balk, op de onthaalpagina een aftelklok tot het heropeningsmoment en een knop naar <a className="inline" href={WACHT_URL} target="_blank" rel="noreferrer">apotheek.be</a>. Na de laatste gesloten dag verdwijnt alles weer. Periodes binnen de 30 dagen worden vooraf al aangekondigd. Wat u hier bewaart, wordt centraal opgeslagen en is dus overal ter wereld zichtbaar.</p>
            </aside>
          </div>
        </div>
      </section>

      <BeheerBerichten
        wijzer={voorstelWijzer}
        onGeplaatst={() => { setVoorstelWijzer(""); setVoorstelRonde((r) => r + 1); }}
      />

      <section className="container section beheer bh-vacc">
        <div className="bh-top">
          <div>
            <span className="mono">Beheer · vaccinaties</span>
            <h2>Covid- &amp; griep<em>agenda</em></h2>
            <p className="bh-lede">
              De vaccinatiedagen komen rechtstreeks van de tablet in de apotheek. Dagen aanduiden, uren instellen of een dag volzet zetten doet u daar — de website volgt binnen enkele minuten.
            </p>
          </div>
          <div className="bh-top-actions">
            <a className="btn btn-primary" href="https://apotheekformulier.netlify.app/admin.html" target="_blank" rel="noreferrer">Agenda op de tablet openen<span className="arr" aria-hidden="true"></span></a>
          </div>
        </div>
        <p className="bh-sync" role="status">Hieronder ziet u wat bezoekers nu op de pagina Diensten te zien krijgen.</p>
        <VaccinatieAgenda />
      </section>
    </div>
  );
};

// ---------- Telefoon (Voys) ----------
// De telefoon staat los van de website: na elke bewaarde periode een herinnering.
const VOYS_URL = "https://www.voys.be/";

// "25 december 2026 en 1 januari 2027"
const dagenZin = (dagen) => dagen.map((d) => fmtDate(d)).join(" en ");
// "op 12 november 2026" of "van 11 tot en met 15 november 2026"
const periodeTekst = (p) => (p.from === p.to
  ? `op ${fmtDate(p.from)}`
  : `van ${fmtDate(p.from)} tot en met ${fmtDate(p.to)}`);

const VoysHerinnering = ({ periode, dagen, soort, onSluit }) => (
  <aside className="voys-herinnering" role="status" aria-live="polite">
    <div>
      <span className="mono">Telefoon · Voys</span>
      <h3>Vergeet de telefoon niet</h3>
      <p>
        {soort === "sluiting-terug" && periode
          // Teruggedraaid: wat ze net in Voys instelde, moet weer weg.
          ? <>Draai in Voys de sluiting <strong>{periodeTekst(periode)}</strong> ook weer terug, anders horen bellers een melding die niet meer klopt.</>
          : soort === "terug" && periode
          // Teruggedraaid: de dag is weer een gewone feestdag, dus de
          // doorschakeling moet weer aan staan.
          ? <>Zet in Voys de doorschakeling weer <strong>aan</strong> voor <strong>{dagen && dagen.length ? dagenZin(dagen) : fmtDate(periode.from)}</strong>: die feestdag is de apotheek toch gesloten.</>
          : soort === "open" && periode
          // Op een feestdag staat de telefoon normaal doorgeschakeld naar de
          // wachtdienst. Bent u die dag open, dan moet die doorschakeling uit,
          // anders sturen bellers naar een andere apotheek terwijl u er staat.
          ? <>Zet in Voys de doorschakeling <strong>uit</strong> voor <strong>{dagen && dagen.length ? dagenZin(dagen) : fmtDate(periode.from)}</strong>: op een feestdag gaan bellers anders naar de apotheek van wacht, terwijl u gewoon open bent.</>
          : periode
            ? <>Stel in Voys ook de sluiting in <strong>{periodeTekst(periode)}</strong>, zodat bellers de juiste melding horen.</>
            : <>Pas in Voys ook de sluiting aan, zodat bellers de juiste melding horen.</>}
      </p>
    </div>
    <div className="voys-acties">
      <a className="btn btn-primary" href={VOYS_URL} target="_blank" rel="noreferrer">Naar Voys<span className="arr" aria-hidden="true"></span></a>
      <button type="button" className="bh-lock" onClick={onSluit}>Gedaan</button>
    </div>
  </aside>
);

// ---------- Sluitingsvoorstellen ----------
// Een nieuwsbericht dat een sluiting aankondigt levert een voorstel op. Het
// wordt nooit zelf een sluiting: een foute lezing zou de apotheek op de website
// sluiten terwijl ze open is. De apotheker tikt Toevoegen of Negeren.
const VOORSTELLEN_API = "/api/closure-voorstellen";
const VOORSTELLEN_ID = "sluitingsvoorstellen";

// "woensdag 11 november 2026" — de weekdag staat erbij zodat een gelezen datum
// in één oogopslag te controleren is.
const fmtDagDatum = (iso) =>
  iso ? dayStart(iso).toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";

const bronRegel = (v) => {
  const d = v.berichtDatum ? new Date(v.berichtDatum) : null;
  return d && !Number.isNaN(d.getTime())
    ? `Uit het bericht van ${d.toLocaleDateString("nl-BE", { day: "numeric", month: "long" })}:`
    : "Uit een bericht:";
};

// Eén dag leest als "Gesloten op vrijdag 14 mei", niet als "van ... tot en met ...".
// Een open-dag zegt er de feestdag bij, want dát is wat het bericht overrulet.
const isOpen = (v) => v.soort === "open";
const periodeZin = (v) => {
  const woord = isOpen(v) ? "Open" : "Gesloten";
  const basis = v.from === v.to
    ? `${woord} op ${fmtDagDatum(v.from)}`
    : `${woord} van ${fmtDagDatum(v.from)} tot en met ${fmtDagDatum(v.to)}`;
  return isOpen(v) && v.reason ? `${basis}, ook al is het ${v.reason}` : basis;
};
// Kort, voor de naam van een knop.
const periodeKort = (v) => (v.from === v.to ? fmtDate(v.from) : `${fmtDate(v.from)} tot ${fmtDate(v.to)}`);

// De korte reden die de server uit het bericht las ("Brugdagen", "Jaarlijkse
// vakantie"). Ze staat in het veld en is aan te passen vóór ze op de site komt.
const standaardReden = (v) => (v.reason || "Gesloten").slice(0, 120);

// De feestdagen in een periode — dezelfde lijst als de website gebruikt. Een
// open-bereik kan er meer dan één raken ("van 24 december tot en met 2 januari"
// gaat over Kerstmis én Nieuwjaar), en dan moeten die allebei genoemd worden.
const feestdagenTussen = (from, to) => {
  const jaren = [...new Set([from.slice(0, 4), to.slice(0, 4)].map(Number))];
  return jaren
    .flatMap((j) => holidaysOf(j))
    .filter((h) => h.gesloten && h.iso >= from && h.iso <= to)
    .sort((a, b) => (a.iso < b.iso ? -1 : 1));
};
// De dagen uit een open-voorstel die haar eigen sluiting níet al dichthoudt.
const openDagenZonderSluiting = (v) => feestdagenTussen(v.from, v.to).filter((h) => !closureOp(h.iso));

// Geen statuscodes of Engelse browserfouten tonen, maar gewone taal.
const foutTekst = (res, data) => {
  if (!res) return "Geen verbinding met de server. Probeer het opnieuw.";
  if (data && data.melding) return data.melding; // 401 en 429 leggen het zelf al uit
  if (res.status === 404) return "Dit voorstel was al afgehandeld, misschien in een ander venster.";
  return "De server kon het niet bewaren. Probeer het opnieuw.";
};

// De telefoon staat los van de website. Bij een melding is er geen tik meer
// geweest waar de herinnering aan kon hangen, dus staat ze in de melding zelf —
// het is het enige dat zij nog met de hand moet doen.
const VoysRegel = ({ v }) => {
  const dagen = isOpen(v) ? openDagenZonderSluiting(v).map((h) => h.iso) : [];
  if (isOpen(v) && !dagen.length) return null; // eigen sluiting gaat voor: niets te doen
  return (
    <p className="voorstel-voys">
      <strong>Vergeet de telefoon niet.</strong>{" "}
      {isOpen(v)
        ? <>Zet in Voys de doorschakeling <strong>uit</strong> voor {dagen.map((d) => fmtDate(d)).join(" en ")}, anders gaan bellers naar de apotheek van wacht terwijl u open bent.</>
        : <>Stel in Voys ook de sluiting in {periodeTekst(v)}, zodat bellers de juiste melding horen.</>}{" "}
      <a className="inline" href={VOYS_URL} target="_blank" rel="noreferrer">Naar Voys →</a>
    </p>
  );
};

// Wat staat er van deze melding nu echt op de website? De apotheker kan de
// sluiting intussen zelf aangepast of verwijderd hebben; dan mag de melding
// niet blijven doen alsof ze nog klopt.
// Wat de melding moet tonen: de sluiting zoals ze nu op de site staat, zodat
// Aanpassen haar eigen wijziging en notitie niet overschrijft met oude waarden.
const toonWaarden = (v, closures) => {
  if (!v.toegepast || v.soort === "open") return v;
  const c = (closures || []).find((x) => x.id === v.closureId);
  return c ? { ...v, from: c.from, to: c.to, reason: c.reason, note: c.note } : v;
};

const staatVanMelding = (v, closures) => {
  if (v.soort === "open") return { stand: "ok", closure: null };
  const c = (closures || []).find((x) => x.id === v.closureId);
  if (!c) return { stand: "weg", closure: null };
  if (c.from !== v.from || c.to !== v.to || c.reason !== v.reason) return { stand: "gewijzigd", closure: c };
  return { stand: "ok", closure: c };
};

const Sluitingsvoorstellen = ({ ronde, onNieuw, onToegevoegd, onAanpassen, herscanRonde, closures }) => {
  const code = () => { try { return sessionStorage.getItem(CODE_KEY) || ""; } catch (e) { return ""; } };
  const [list, setList] = React.useState([]);
  const [redenen, setRedenen] = React.useState({});
  const [bezig, setBezig] = React.useState("");
  const [fout, setFout] = React.useState({ id: "", tekst: "" });
  const [melding, setMelding] = React.useState("");
  const [laadfout, setLaadfout] = React.useState("");
  // Herinnering voor de telefoon, hier in het kader zelf: de knop staat hier,
  // en bovenaan de pagina ziet ze ze niet.
  const [voys, setVoys] = React.useState(null);
  // Na elke actie opnieuw ophalen: wat de server zegt telt, niet wat de pagina
  // hoopt. Twee tikken kort na elkaar lieten anders een melding verdwijnen
  // terwijl de sluiting op de site bleef staan.
  const [vernieuw, setVernieuw] = React.useState(0);
  const kader = React.useRef(null);
  const gezien = React.useRef(new Set());
  const vorigeHerscan = React.useRef(-1);

  // Bij het laden ook de al bewaarde berichten herscannen, zodat een sluiting
  // uit een ouder bericht hier alsnog boven komt. Na een nieuw bericht volstaat
  // gewoon ophalen: de server heeft het dan al gelezen.
  React.useEffect(() => {
    let af = false;
    (async () => {
      try {
        // Herscannen bij het openen van de pagina en wanneer zij erom vraagt;
        // na een eigen actie volstaat gewoon ophalen.
        const herscan = vorigeHerscan.current !== herscanRonde;
        vorigeHerscan.current = herscanRonde;
        const vraag = herscan ? "herscan=1&" : "";
        const res = await fetch(`${VOORSTELLEN_API}?${vraag}t=${Date.now()}`, { headers: { "X-Beheer-Code": code() }, cache: "no-store" });
        if (res.status === 401 || res.status === 429) {
          // Herladen helpt dan niet: ze moet opnieuw inloggen.
          if (!af) setLaadfout("De beheercode werd geweigerd. Vergrendel de pagina en meld u opnieuw aan.");
          return;
        }
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        if (af) return;
        const nieuw = Array.isArray(data.voorstellen) ? data.voorstellen : [];
        setLaadfout("");
        setList(nieuw);
        const bij = nieuw.filter((v) => !gezien.current.has(v.id));
        nieuw.forEach((v) => gezien.current.add(v.id));
        if (ronde && bij.length && onNieuw) onNieuw(bij.length);
        // Na een tik op "Berichten nu nalezen" hoort er een antwoord te komen,
        // ook als er niets nieuws is.
        if (herscanRonde && herscan) setMelding(bij.length
          ? `De berichten zijn nagelezen: ${bij.length === 1 ? "er is één nieuwe melding" : `er zijn ${bij.length} nieuwe meldingen`} hieronder.`
          : "De berichten zijn nagelezen. Er is niets nieuws.");
      } catch (e) {
        // Stil mislukken is erger dan een regel tekst: dan denkt ze dat er
        // gewoon geen voorstel is.
        if (!af) setLaadfout("De sluitingsvoorstellen konden niet opgehaald worden. Herlaad de pagina om het opnieuw te proberen.");
      }
    })();
    return () => { af = true; };
  }, [ronde, herscanRonde, vernieuw]);

  const doe = async (v, actie) => {
    setBezig(v.id);
    setFout({ id: "", tekst: "" });
    let res = null;
    let data = null;
    let weg = false; // is de balk verdwenen? dan moet de focus mee verhuizen
    try {
      const reden = (redenen[v.id] === undefined ? standaardReden(v) : redenen[v.id]).trim() || "Gesloten";
      res = await fetch(`${VOORSTELLEN_API}/${v.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Beheer-Code": code() },
        body: JSON.stringify(actie === "toevoegen" && !isOpen(v) ? { actie, reden } : { actie }),
      });
      data = await res.json().catch(() => null);
      if (res.status === 404) {
        // Elders al afgehandeld: de balk hoort weg, niet blijven falen.
        weg = true;
        setList((l) => l.filter((x) => x.id !== v.id));
        setMelding(foutTekst(res, null));
        return;
      }
      if (!res.ok) throw new Error("niet bewaard");
      weg = true;
      setList((l) => l.filter((x) => x.id !== v.id));
      if (actie === "terugdraaien") {
        setMelding(isOpen(v)
          ? "Teruggedraaid. Die feestdag telt weer als sluitingsdag."
          : "Teruggedraaid. De sluiting staat niet meer op de website.");
        // De telefoon stond volgens de melding net ingesteld; die instelling
        // moet nu weer terug.
        setVoys({ soort: isOpen(v) ? "terug" : "sluiting-terug", periode: { from: v.from, to: v.to }, dagen: isOpen(v) ? v.dagen : [] });
        fetchClosures();
      } else if (actie === "weg") {
        setMelding("Melding weggeklikt. De sluiting blijft op de website staan.");
      } else if (actie === "toevoegen") {
        const dubbel = !!(data && data.dubbel);
        if (isOpen(v)) {
          setMelding(dubbel
            ? "Die dag stond al als open."
            : !openDagenZonderSluiting(v).length
              // Haar eigen sluiting gaat voor: op de website verandert er niets.
              ? "Genoteerd. Zolang uw sluitingsperiode over die dag loopt, blijft de website gesloten tonen."
              : "Feestdag aangepast. De apotheek staat die dag nu als open op de website.");
        } else {
          setMelding(dubbel
            ? "Die periode stond al in de lijst — er is niets dubbel bijgekomen."
            : "Sluiting toegevoegd. Ze staat nu op de website.");
        }
        if (onToegevoegd) onToegevoegd(v, (data && data.melding) || "Toegevoegd.", dubbel);
      } else {
        setMelding("Voorstel genegeerd.");
      }
    } catch (e) {
      setFout({ id: v.id, tekst: foutTekst(res && res.status ? res : null, data) });
    } finally {
      setBezig("");
      // De gedrukte knop verdwijnt uit de pagina: focus naar het kader, dat nu
      // de melding draagt, in plaats van terug naar de bovenkant van de pagina.
      if (weg && kader.current) kader.current.focus();
      setVernieuw((v) => v + 1);
    }
  };

  // Het kader staat er altijd (leeg is het onzichtbaar), zodat een schermlezer
  // een voorstel dat later binnenkomt wél hoort.
  return (
    <div className="voorstellen" id={VOORSTELLEN_ID} ref={kader} tabIndex={-1} aria-live="polite">
      {list.map((v) => (
        <aside className={`voorstel ${isOpen(v) ? "voorstel-open" : ""} ${v.toegepast ? "voorstel-gedaan" : ""}`} key={v.id} aria-label={`${v.toegepast ? "Automatisch overgenomen" : "Voorgestelde"} ${isOpen(v) ? "open dag" : "sluiting"} ${periodeKort(v)}`}>
          <div>
            <span className="mono">
              {v.toegepast
                ? (isOpen(v) ? "Automatisch overgenomen · feestdag toch open" : "Automatisch overgenomen uit een bericht")
                : (isOpen(v) ? "Voorstel · feestdag toch open" : "Voorstel · gelezen uit een bericht")}
            </span>
            <p className="voorstel-bron">{bronRegel(v)} {v.berichtTitel ? <strong>{v.berichtTitel}</strong> : <em>bericht zonder titel</em>}</p>
            <h2>{periodeZin(toonWaarden(v, closures))}{v.toegepast && !isOpen(v) && toonWaarden(v, closures).reason ? ` · ${toonWaarden(v, closures).reason}` : ""}</h2>
            <p className="voorstel-uitleg">
              {v.toegepast && staatVanMelding(v, closures).stand === "weg"
                ? "Deze sluiting staat niet meer op de website — u hebt ze zelf verwijderd of vervangen."
                : v.toegepast && staatVanMelding(v, closures).stand === "gewijzigd"
                  ? "U hebt deze sluiting intussen zelf aangepast. Wat hieronder staat, is wat er nu op de website staat."
                  : v.toegepast
                ? (v.nuZichtbaar
                  // Loopt ze nu of begint ze binnen een dag, dan ziet een klant
                  // het al. Dat hoort ze te weten, niet pas later te ontdekken.
                  ? "Dit staat nu al op de website — klanten zien het dus al. Klopt het niet, tik dan Terugdraaien."
                  : isOpen(v)
                    ? "Dit staat al op de website. Klopt het niet, tik dan Terugdraaien."
                    : "Dit staat al op de website. Klopt het niet, tik dan Terugdraaien; wilt u de datums of de reden bijwerken, tik dan Aanpassen.")
                : !isOpen(v)
                  ? "Dit staat nog niet op de website. Toevoegen zet de sluiting meteen online."
                  : !openDagenZonderSluiting(v).length
                    // Haar eigen sluiting gaat voor: dan verandert er niets op de site.
                    ? "U hebt zelf een sluitingsperiode over die dag. Die gaat voor, dus de website blijft die dag gesloten tonen — ook na Toevoegen."
                    : "De website toont die dag nu nog Gesloten, omdat het een feestdag is. Toevoegen laat de gewone uren gelden. Een sluitingsperiode die u zelf ingaf blijft wel voorgaan."}
            </p>
            {isOpen(v) || v.toegepast ? null : (
              <label className="bh-field voorstel-reden">
                <span>Reden (zichtbaar op de website)</span>
                <input
                  type="text"
                  maxLength={120}
                  value={redenen[v.id] === undefined ? standaardReden(v) : redenen[v.id]}
                  onChange={(e) => setRedenen({ ...redenen, [v.id]: e.target.value })}
                  placeholder="Gesloten"
                />
              </label>
            )}
            {!v.toegepast && v.waarom ? <p className="voorstel-waarom">Niet vanzelf overgenomen: {v.waarom}.</p> : null}
            {v.toegepast && staatVanMelding(v, closures).stand !== "weg" ? <VoysRegel v={toonWaarden(v, closures)} /> : null}
            {fout.id === v.id ? <p className="field-error" role="alert">{fout.tekst}</p> : null}
          </div>
          <div className="voorstel-acties">
            {v.toegepast ? (
              <>
                {staatVanMelding(v, closures).stand === "weg" ? null : (
                  <button type="button" className="btn btn-ghost" disabled={bezig === v.id} onClick={() => doe(v, "terugdraaien")}>
                    {bezig === v.id ? "Bezig…" : "Terugdraaien"}<span className="sr-only"> — {periodeKort(v)}</span>
                  </button>
                )}
                {isOpen(v) || staatVanMelding(v, closures).stand === "weg" ? null : (
                  <button type="button" className="btn btn-ghost" disabled={bezig === v.id} onClick={() => onAanpassen && onAanpassen(toonWaarden(v, closures))}>
                    Aanpassen<span className="sr-only"> — {periodeKort(v)}</span>
                  </button>
                )}
                <button type="button" className="bh-lock" disabled={bezig === v.id} onClick={() => doe(v, "weg")}>
                  Gezien<span className="sr-only"> — {periodeKort(v)}</span>
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-primary" disabled={bezig === v.id} onClick={() => doe(v, "toevoegen")}>
                  {bezig === v.id ? "Bezig…" : "Toevoegen"}<span className="sr-only"> — {periodeKort(v)}</span><span className="arr" aria-hidden="true"></span>
                </button>
                <button type="button" className="btn btn-ghost" disabled={bezig === v.id} onClick={() => doe(v, "negeren")}>
                  Negeren<span className="sr-only"> — {periodeKort(v)}</span>
                </button>
              </>
            )}
          </div>
        </aside>
      ))}
      {laadfout ? <p className="voorstel-melding err">{laadfout}</p> : null}
      {melding ? <p className="voorstel-melding">{melding}</p> : null}
      {voys ? <VoysHerinnering {...voys} onSluit={() => setVoys(null)} /> : null}
    </div>
  );
};

// De naam van de feestdag op een datum ("Wapenstilstand").
const naamVan = (iso) => {
  const f = holidayOn(dayStart(iso));
  return f ? f.name : "Feestdag";
};

// ---------- Feestdagen waarop de apotheek toch open is ----------
// Wat hier staat, kwam uit een nieuwsbericht en is door haarzelf bevestigd.
// Eén verkeerde tik mag niet betekenen dat een feestdag voorgoed open staat,
// dus kan elke dag hier weer teruggedraaid worden.
const FeestdagenOpen = ({ onKlaar }) => {
  const code = () => { try { return sessionStorage.getItem(CODE_KEY) || ""; } catch (e) { return ""; } };
  const dagen = useFeestdagOpen();
  const [bezig, setBezig] = React.useState("");
  const [fout, setFout] = React.useState("");
  const [melding, setMelding] = React.useState("");
  // De herinnering voor de telefoon hoort hier te staan: de knop staat
  // onderaan de pagina, en bovenaan ziet ze ze niet.
  const [voys, setVoys] = React.useState(null);
  const kader = React.useRef(null);

  const terug = async (dag) => {
    setBezig(dag);
    setFout("");
    let res = null;
    let data = null;
    try {
      res = await fetch(`${VOORSTELLEN_API}/${dag}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Beheer-Code": code() },
        body: JSON.stringify({ actie: "feestdag-terug" }),
      });
      data = await res.json().catch(() => null);
      if (res.status === 404) {
        // Elders al teruggedraaid: de rij hoort weg, niet blijven falen.
        setMelding("Die dag stond al niet meer als open.");
        await fetchClosures();
        return;
      }
      if (!res.ok) throw new Error("niet bewaard");
      const eigenSluiting = !!closureOp(dag);
      await fetchClosures();
      setMelding(`${naamVan(dag)} ${fmtDate(dag)} is weer een gewone sluitingsdag.`);
      // Stond de doorschakeling nooit uit (omdat haar eigen sluiting voorging),
      // dan hoeft ze ook niets weer aan te zetten.
      if (!eigenSluiting) setVoys({ periode: { from: dag, to: dag }, dagen: [dag] });
      if (onKlaar) onKlaar((data && data.melding) || "De feestdag geldt weer.");
    } catch (e) {
      setFout(foutTekst(res && res.status ? res : null, data));
    } finally {
      setBezig("");
      // De gedrukte knop verdwijnt: focus naar het kader met de melding.
      if (kader.current) kader.current.focus();
    }
  };

  if (!dagen.length && !melding) return null;

  return (
    <div className="bh-feestdagen" ref={kader} tabIndex={-1} aria-live="polite">
      {dagen.length ? (
        <>
          <h3>Feestdagen waarop u toch open bent</h3>
          <p className="bh-feestdagen-lede">
            Gelezen uit een nieuwsbericht. De website toont op die dagen gewoon de openingsuren — behalve waar u zelf een sluitingsperiode hebt staan.
          </p>
        </>
      ) : null}
      <ul>
        {dagen.map((d) => {
          const naam = naamVan(d);
          // Loopt er een eigen sluitingsperiode over die dag, dan wint die —
          // dezelfde rangorde als de status op de website.
          const dicht = closureOp(d);
          return (
            <li key={d} className={dicht ? "dicht" : ""}>
              <span><strong>{naam}</strong> {fmtDate(d)} — {dicht ? "maar u bent dan gesloten (eigen sluitingsperiode)" : "wij zijn open"}</span>
              <button type="button" disabled={bezig === d} onClick={() => terug(d)}>
                {bezig === d ? "Bezig…" : "Terugdraaien"}<span className="sr-only"> — {naam} {fmtDate(d)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {melding ? <p className="voorstel-melding">{melding}</p> : null}
      {voys ? <VoysHerinnering {...voys} soort="terug" onSluit={() => setVoys(null)} /> : null}
      {fout ? <p className="field-error" role="alert">{fout}</p> : null}
    </div>
  );
};

// ---------- Berichten (nieuws op de onthaalpagina) ----------
const leegBericht = () => ({ titel: "", tekst: "", knopLabel: "", knopUrl: "", facebookUrl: "", vastgezet: false, verloopt: "", foto: "", fotoNaam: "" });

const leesAlsDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = reject;
  r.readAsDataURL(file);
});

const BeheerBerichten = ({ wijzer, onGeplaatst }) => {
  const code = () => { try { return sessionStorage.getItem(CODE_KEY) || ""; } catch (e) { return ""; } };
  const [list, setList] = React.useState([]);
  const [draft, setDraft] = React.useState(leegBericht);
  const [msg, setMsg] = React.useState({ state: "idle", text: "" });

  const laad = async () => {
    try {
      const res = await fetch(`${NIEUWS_API}?alles=1&t=${Date.now()}`, { headers: { "X-Beheer-Code": code() }, cache: "no-store" });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      setList(Array.isArray(data.berichten) ? data.berichten : []);
    } catch (e) {
      setMsg({ state: "err", text: "Berichten ophalen lukte niet. Is er verbinding met de server?" });
    }
  };
  React.useEffect(() => { laad(); }, []);

  const onFoto = async (e) => {
    const f = e.target.files[0];
    if (!f) return setDraft({ ...draft, foto: "", fotoNaam: "" });
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { e.target.value = ""; return setMsg({ state: "err", text: "Kies een foto in jpg, png of webp." }); }
    if (f.size > 4 * 1024 * 1024) { e.target.value = ""; return setMsg({ state: "err", text: "Die foto is groter dan 4 MB." }); }
    setDraft({ ...draft, foto: await leesAlsDataUrl(f), fotoNaam: f.name });
    setMsg({ state: "idle", text: "" });
  };

  const plaats = async (e) => {
    e.preventDefault();
    const formEl = e.target;
    if (!draft.tekst.trim() && !draft.titel.trim()) return setMsg({ state: "err", text: "Vul minstens een titel of tekst in." });
    setMsg({ state: "busy", text: "Bericht plaatsen…" });
    const body = {
      titel: draft.titel,
      tekst: draft.tekst,
      vastgezet: draft.vastgezet,
      verloopt: draft.verloopt ? `${draft.verloopt}T23:59:59` : null,
      knop: draft.knopUrl ? { label: draft.knopLabel || "Meer info", url: draft.knopUrl } : null,
      facebookUrl: draft.facebookUrl || null,
      foto: draft.foto || null,
    };
    try {
      const res = await fetch(NIEUWS_API, { method: "POST", headers: { "Content-Type": "application/json", "X-Beheer-Code": code() }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.melding || data.error || res.status);
      setDraft(leegBericht());
      formEl.reset();
      setMsg({ state: "ok", text: "Bericht geplaatst — het staat nu op de onthaalpagina." });
      laad();
      // De server leest het bericht meteen: de voorstellen bovenaan opnieuw ophalen.
      if (onGeplaatst) onGeplaatst();
    } catch (err) {
      setMsg({ state: "err", text: `Plaatsen lukte niet (${err.message}).` });
    }
  };

  const verwijder = async (b) => {
    if (!window.confirm(`Bericht "${b.titel || b.tekst.slice(0, 40)}" verwijderen?`)) return;
    try {
      const res = await fetch(`${NIEUWS_API}/${b.id}`, { method: "DELETE", headers: { "X-Beheer-Code": code() } });
      if (!res.ok) throw new Error(res.status);
      setMsg({ state: "ok", text: "Bericht verwijderd." });
      laad();
    } catch (err) {
      setMsg({ state: "err", text: "Verwijderen lukte niet." });
    }
  };

  const nu = Date.now();
  return (
    <section className="container section beheer bh-berichten">
      <div className="bh-top">
        <div>
          <span className="mono">Beheer · nieuws</span>
          <h2>Berichten op de <em>onthaalpagina</em></h2>
          <p className="bh-lede">
            Berichten uit de posting-app verschijnen hier vanzelf. U kan hier ook zelf een bericht plaatsen of er een weghalen. Zonder berichten toont de website geen nieuwsblok.
          </p>
        </div>
        <div className="bh-top-actions">
          <a className="btn btn-primary" href="https://post-maken.netlify.app" target="_blank" rel="noreferrer">Post maken openen<span className="arr" aria-hidden="true"></span></a>
        </div>
      </div>
      {msg.text ? <div className={`bh-sync ${msg.state}`} role="status" aria-live="polite">{msg.text}</div> : null}
      <div className="bh-grid">
        <form className="bh-form" onSubmit={plaats}>
          <h2>Nieuw bericht</h2>
          <label className="bh-field">
            <span>Titel (optioneel)</span>
            <input type="text" maxLength={140} value={draft.titel} onChange={(e) => setDraft({ ...draft, titel: e.target.value })} placeholder="Bv. De griepprik kan weer" />
          </label>
          <label className="bh-field">
            <span>Tekst</span>
            <textarea rows="4" maxLength={3000} value={draft.tekst} onChange={(e) => setDraft({ ...draft, tekst: e.target.value })} />
          </label>
          <label className="bh-field">
            <span>Foto (optioneel, max 4 MB)</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFoto} />
          </label>
          <div className="bh-row">
            <label className="bh-field">
              <span>Knoptekst (optioneel)</span>
              <input type="text" maxLength={40} value={draft.knopLabel} onChange={(e) => setDraft({ ...draft, knopLabel: e.target.value })} placeholder="Plaats reserveren" />
            </label>
            <label className="bh-field">
              <span>Knoplink (https://…)</span>
              <input type="url" pattern="https://.*" value={draft.knopUrl} onChange={(e) => setDraft({ ...draft, knopUrl: e.target.value })} />
            </label>
          </div>
          <div className="bh-row">
            <label className="bh-field">
              <span>Verdwijnt na (optioneel)</span>
              <input type="date" value={draft.verloopt} onChange={(e) => setDraft({ ...draft, verloopt: e.target.value })} />
            </label>
            <label className="bh-field">
              <span>Link naar Facebook-post</span>
              <input type="url" pattern="https://.*" value={draft.facebookUrl} onChange={(e) => setDraft({ ...draft, facebookUrl: e.target.value })} />
            </label>
          </div>
          <label className="bh-check">
            <input type="checkbox" checked={draft.vastgezet} onChange={(e) => setDraft({ ...draft, vastgezet: e.target.checked })} />
            <span>Vastzetten bovenaan (bv. bij vakantie)</span>
          </label>
          <div className="bh-form-actions">
            <button className="btn btn-primary" type="submit" disabled={msg.state === "busy"}>Bericht plaatsen<span className="arr" aria-hidden="true"></span></button>
          </div>
          {wijzer ? (
            <p className="bh-wijzer" role="status">
              {wijzer} <a className="inline" href={`#${VOORSTELLEN_ID}`}>Naar het bericht bovenaan</a>
            </p>
          ) : null}
        </form>
        <div className="bh-list">
          <h2>Geplaatste berichten</h2>
          {list.length === 0 ? (
            <p className="bh-empty">Nog geen berichten. De onthaalpagina toont dan geen nieuwsblok.</p>
          ) : (
            <ul>
              {list.map((b) => {
                const voorbij = b.verloopt && Date.parse(b.verloopt) <= nu;
                return (
                  <li key={b.id} className={`bh-item ${voorbij ? "past" : ""}`}>
                    <div className="bh-item-main">
                      <span className={`bh-tag ${b.vastgezet ? "now" : ""}`}>{voorbij ? "Verlopen" : b.vastgezet ? "Vastgezet" : "Zichtbaar"}</span>
                      <p className="bh-item-dates">{b.titel || b.tekst.slice(0, 60)}</p>
                      <p className="bh-item-note">{new Date(b.datum).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })}{b.foto ? " · met foto" : ""}</p>
                    </div>
                    <div className="bh-item-actions">
                      <button type="button" className="del" onClick={() => verwijder(b)}>Verwijderen<span className="sr-only"> — {b.titel || "bericht"}</span></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

export { BeheerPage };
