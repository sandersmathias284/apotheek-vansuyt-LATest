// Beheer — beveiligde pagina om sluitingsperiodes te beheren
import React from "react";
import { useNow } from "../lib/hours.js";
import { useClosures, activeClosure, writeClosures, pushClosures, fetchClosures, remoteState, checkCode, isoOf, fmtDate, WACHT_URL } from "../components/Closure.jsx";
import { VaccinatieAgenda } from "./Catalog.jsx";
import { hrefOf } from "../routes.js";
import { NIEUWS_API } from "../components/Nieuws.jsx";

const SESSION_KEY = "vansuyt.beheer.sessie";
const CODE_KEY = "vansuyt.beheer.code";

const BeheerPage = ({ setPage }) => {
  const [unlocked, setUnlocked] = React.useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch (e) { return false; }
  });
  const [pin, setPin] = React.useState("");
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const code = pin.trim();
    if (!code || busy) return;
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
  const commit = async (next, okMsg) => {
    setList(writeClosures(next));
    setSync({ state: "busy", msg: "Centraal bewaren…" });
    const res = await pushClosures(next, sessionStorage.getItem(CODE_KEY) || "");
    if (res.ok) {
      setSync({ state: "ok", msg: "Centraal bewaard — zichtbaar voor alle bezoekers." });
      say(okMsg);
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
    commit(next, wasEdit ? "Periode aangepast." : "Periode toegevoegd.");
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
            <button type="button" className="bh-lock" onClick={onLock}>Vergrendelen</button>
          </div>
        </div>

        {sync.msg ? (
          <div className={`bh-sync ${sync.state}`} role="status" aria-live="polite">{sync.msg}</div>
        ) : null}

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
            <aside className="callout" style={{ marginTop: 24 }}>
              <span className="mono">Zo werkt het</span>
              <h3>Automatisch aan en uit</h3>
              <p>Op de eerste gesloten dag schakelt de website zelf over: bovenaan verschijnt een balk, op de onthaalpagina een aftelklok tot het heropeningsmoment en een knop naar <a className="inline" href={WACHT_URL} target="_blank" rel="noreferrer">apotheek.be</a>. Na de laatste gesloten dag verdwijnt alles weer. Periodes binnen de 30 dagen worden vooraf al aangekondigd. Wat u hier bewaart, wordt centraal opgeslagen en is dus overal ter wereld zichtbaar.</p>
            </aside>
          </div>
        </div>
      </section>

      <BeheerBerichten />

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

// ---------- Berichten (nieuws op de onthaalpagina) ----------
const leegBericht = () => ({ titel: "", tekst: "", knopLabel: "", knopUrl: "", facebookUrl: "", vastgezet: false, verloopt: "", foto: "", fotoNaam: "" });

const leesAlsDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = reject;
  r.readAsDataURL(file);
});

const BeheerBerichten = () => {
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
      if (!res.ok) throw new Error(data.error || res.status);
      setDraft(leegBericht());
      formEl.reset();
      setMsg({ state: "ok", text: "Bericht geplaatst — het staat nu op de onthaalpagina." });
      laad();
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
