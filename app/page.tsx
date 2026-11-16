"use client";

import { useEffect, useMemo, useState } from "react";
import { formatTime, scaledIngredient, starterRecipes, type Recipe } from "../lib/recipes";

type Screen = "home" | "recipe" | "cook";
type Timer = { id: string; title: string; endAt: number; duration: number };
const LIBRARY_KEY = "mise:library:v1";
const CHECKS_KEY = "mise:checks:v1";
const TIMER_KEY = "mise:timers:v1";

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const shared = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  const paths: Record<string, React.ReactNode> = {
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    back: <path d="m15 18-6-6 6-6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5z" /><path d="M4 19.5v-13" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    link: <><path d="M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" /></>,
    spark: <><path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9zM19 17v5m-2.5-2.5h5" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1" /></>,
    timer: <><circle cx="12" cy="13" r="9" /><path d="M12 8v5l4 2M9 2h6" /></>,
    edit: <><path d="M14 4 20 10M4 20l4.5-1 11-11a3 3 0 0 0-4-4l-11 11z" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" /></>,
    share: <><path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7" /></>,
    chef: <><path d="M6 14a5 5 0 0 1-1-9 5 5 0 0 1 9-1 5 5 0 1 1 5 9v7H6zM6 17h13" /></>
  };
  return <svg {...shared}>{paths[name] || paths.spark}</svg>;
}

function RecipePhoto({ recipe, className = "" }: { recipe: Recipe; className?: string }) {
  return <div className={"recipe-photo " + className}>
    {recipe.image ? <img src={recipe.image} alt={recipe.title} loading="lazy" onError={e => { e.currentTarget.style.display = "none"; }} /> : null}
    <div className="photo-fallback"><Icon name="chef" size={40} /></div>
  </div>;
}
function TimeLabel({ minutes }: { minutes: number }) {
  return <span className="meta-unit"><Icon name="clock" size={15} /> {minutes} min</span>;
}

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>(starterRecipes);
  const [ready, setReady] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [timers, setTimers] = useState<Timer[]>([]);
  const [now, setNow] = useState(Date.now());
  const [selectedId, setSelectedId] = useState("sample-pasta");
  const [screen, setScreen] = useState<Screen>("home");
  const [cookIndex, setCookIndex] = useState(0);
  const [servings, setServings] = useState(2);
  const [importOpen, setImportOpen] = useState(false);
  const [importType, setImportType] = useState<"url" | "manual">("url");
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [timerOpen, setTimerOpen] = useState(false);
  const [manual, setManual] = useState({ title: "", minutes: "30", servings: "2", ingredients: "", steps: "" });
  const [customMinutes, setCustomMinutes] = useState("5");
  const [search, setSearch] = useState("");
  const selected = recipes.find(r => r.id === selectedId) ?? recipes[0];
  const activeTimers = timers.filter(t => t.endAt > now).length;
  const visibleRecipes = useMemo(() => recipes.filter(r => (r.title + " " + r.category).toLowerCase().includes(search.toLowerCase())), [recipes, search]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LIBRARY_KEY);
      if (stored) { const parsed: unknown = JSON.parse(stored); if (Array.isArray(parsed)) setRecipes(parsed as Recipe[]); }
      const savedChecks = localStorage.getItem(CHECKS_KEY);
      if (savedChecks) setChecks(JSON.parse(savedChecks));
      const savedTimers = localStorage.getItem(TIMER_KEY);
      if (savedTimers) setTimers(JSON.parse(savedTimers));
    } catch { /* gracefully use starter recipes */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(LIBRARY_KEY, JSON.stringify(recipes)); }, [ready, recipes]);
  useEffect(() => { if (ready) localStorage.setItem(CHECKS_KEY, JSON.stringify(checks)); }, [ready, checks]);
  useEffect(() => { if (ready) localStorage.setItem(TIMER_KEY, JSON.stringify(timers)); }, [ready, timers]);
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (screen !== "cook" || importOpen || timerOpen || ["INPUT", "TEXTAREA"].includes((event.target as HTMLElement).tagName)) return;
      if (event.key === "ArrowRight") setCookIndex(i => Math.min(i + 1, (selected?.steps.length ?? 1) - 1));
      if (event.key === "ArrowLeft") setCookIndex(i => Math.max(0, i - 1));
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [screen, selected, importOpen, timerOpen]);
  useEffect(() => {
    if (screen !== "cook") return;
    let lock: WakeLockSentinel | undefined;
    navigator.wakeLock?.request("screen").then(v => { lock = v; }).catch(() => {});
    return () => { void lock?.release(); };
  }, [screen]);

  function viewRecipe(recipe: Recipe) {
    setSelectedId(recipe.id);
    setServings(recipe.servings || 2);
    setCookIndex(0);
    setScreen("recipe");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cook(recipe: Recipe) {
    setSelectedId(recipe.id);
    setCookIndex(0);
    setScreen("cook");
    window.scrollTo(0, 0);
  }
  function addRecipe(recipe: Recipe) {
    setRecipes(prev => [recipe, ...prev.filter(r => r.id !== recipe.id)]);
    setImportOpen(false);
    setUrl("");
    setImportError("");
    viewRecipe(recipe);
  }
  async function importRecipe(event: React.FormEvent) {
    event.preventDefault();
    setImporting(true);
    setImportError("");
    try {
      const response = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim() }) });
      const data = await response.json() as { recipe?: Recipe; error?: string };
      if (!response.ok || !data.recipe) throw new Error(data.error || "Couldn't read that recipe.");
      addRecipe(data.recipe);
    } catch (error) { setImportError(error instanceof Error ? error.message : "Import failed."); }
    finally { setImporting(false); }
  }
  function addManual(event: React.FormEvent) {
    event.preventDefault();
    const ingredients = manual.ingredients.split("\n").map(s => s.trim()).filter(Boolean);
    const instructions = manual.steps.split("\n").map(s => s.trim()).filter(Boolean);
    if (!manual.title.trim() || !ingredients.length || !instructions.length) { setImportError("Add a name, at least one ingredient, and at least one step."); return; }
    const recipe: Recipe = {
      id: crypto.randomUUID(),
      title: manual.title.trim().slice(0, 140),
      description: "Your own kitchen creation.",
      image: "",
      sourceName: "My recipe",
      minutes: Math.max(1, Number(manual.minutes) || 30),
      servings: Math.max(1, Number(manual.servings) || 2),
      ingredients,
      steps: instructions.map((text, i) => ({ id: "manual-" + i, text })),
      category: "My recipes",
      createdAt: Date.now()
    };
    addRecipe(recipe);
    setManual({ title: "", minutes: "30", servings: "2", ingredients: "", steps: "" });
  }
  function startTimer(seconds: number, title: string) {
    if (!seconds || seconds < 1) return;
    setTimers(prev => [...prev, { id: crypto.randomUUID(), title, duration: seconds, endAt: Date.now() + seconds * 1000 }]);
    setTimerOpen(true);
  }
  function deleteRecipe(recipe: Recipe) {
    if (!window.confirm("Remove “" + recipe.title + "” from your cookbook?")) return;
    setRecipes(rs => rs.filter(r => r.id !== recipe.id));
    setScreen("home");
  }
  async function share(recipe: Recipe) {
    const shareData = { title: recipe.title, text: "A recipe from my Mise cookbook", url: recipe.sourceUrl || location.href };
    try { if (navigator.share) await navigator.share(shareData); else await navigator.clipboard.writeText(shareData.url); }
    catch { /* user dismissed */ }
  }
  const completed = selected ? selected.ingredients.filter((_, i) => checks[selected.id + ":" + i]).length : 0;
  const factor = selected ? servings / selected.servings : 1;
  const currentStep = selected?.steps[cookIndex];

  return (
    <main>
      <header className="site-header">
        <div className="shell header-inner">
          <button className="brand" onClick={() => setScreen("home")} aria-label="Mise home"><span className="brand-icon">m.</span><span>mise<span className="brand-dot">.</span></span></button>
          <nav className="top-nav" aria-label="Main navigation">
            <button className={screen === "home" ? "nav-active" : ""} onClick={() => setScreen("home")}>My cookbook</button>
            <button onClick={() => { setImportType("url"); setImportError(""); setImportOpen(true); }}>Import a recipe</button>
          </nav>
          <div className="header-actions">
            <button className="icon-button timer-icon" onClick={() => setTimerOpen(true)} aria-label="View timers"><Icon name="timer" size={21} />{timers.length > 0 && <span className="notif-dot" />}</button>
            <button className="add-button" onClick={() => { setImportType("url"); setImportError(""); setImportOpen(true); }}><Icon name="plus" size={18} /><span>Add recipe</span></button>
          </div>
        </div>
      </header>

      {screen === "home" && <div className="shell">
        <section className="home-hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> A BETTER WAY TO COOK</div>
            <h1>Good food.<br/><em>Less fuss.</em></h1>
            <p>Every recipe you love, without the noise. Save it, follow along, and find your flow in the kitchen.</p>
            <button className="hero-cta" onClick={() => { setImportError(""); setImportOpen(true); }}><Icon name="plus" size={20} /> Import your first recipe <Icon name="arrow" size={20} /></button>
            <div className="hero-sub"><Icon name="spark" size={17} /> From any recipe website. No account needed.</div>
          </div>
          <button className="hero-image" onClick={() => viewRecipe(recipes[0] || starterRecipes[0])} aria-label="Explore the featured recipe">
            <img src="https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1500&q=85" alt="Pasta plated with herbs" />
            <div className="hero-image-tint" />
            <div className="hero-sticker"><span>TONIGHT&apos;S INSPIRATION</span><strong>Lemony garlic<br/>pasta</strong><small>20 MINUTES &nbsp; · &nbsp; ALL COMFORT</small></div>
          </button>
        </section>
        <section className="library" id="cookbook">
          <div className="section-top">
            <div><div className="eyebrow compact">YOUR KITCHEN, YOUR RULES</div><h2>Your cookbook <span className="count">{recipes.length}</span></h2><p>All your good ideas, in one delicious place.</p></div>
            <label className="search-field"><span aria-hidden="true">⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find something delicious..." aria-label="Search saved recipes" /></label>
          </div>
          <div className="recipe-grid">
            {visibleRecipes.map(recipe => <button className="recipe-card" key={recipe.id} onClick={() => viewRecipe(recipe)}>
              <RecipePhoto recipe={recipe} />
              <div className="recipe-card-body"><div className="card-category">{recipe.category}</div><div className="card-title-row"><h3>{recipe.title}</h3><span className="card-arrow"><Icon name="arrow" size={19} /></span></div><p>{recipe.description}</p><div className="card-meta"><TimeLabel minutes={recipe.minutes} /><span className="meta-unit"><Icon name="people" size={16} /> {recipe.servings} servings</span></div></div>
            </button>)}
            <button className="empty-card" onClick={() => { setImportType("url"); setImportOpen(true); }}><span className="empty-plus"><Icon name="plus" size={28} /></span><strong>Something missing?</strong><span>Bring another favorite to the table.</span><b>Add a recipe <Icon name="arrow" size={15} /></b></button>
          </div>
          {visibleRecipes.length === 0 && <p className="no-search">Nothing matched “{search}”. Try a different search.</p>}
        </section>
        <footer className="footer"><span>mise<span className="brand-dot">.</span></span><span>Cook more. Scroll less. Made for the joy of it.</span><span>VERSION 0.1</span></footer>
      </div>}

      {screen === "recipe" && selected && <div className="shell detail-page">
        <button className="back-link" onClick={() => setScreen("home")}><Icon name="back" size={19} /> Back to cookbook</button>
        <div className="detail-grid">
          <div className="detail-left">
            <RecipePhoto recipe={selected} className="detail-photo" />
            <div className="detail-side-note"><Icon name="spark" /> A little prep makes everything more enjoyable.</div>
          </div>
          <div className="detail-right">
            <div className="detail-tag">{selected.category} <span>·</span> {selected.sourceName}</div>
            <h1>{selected.title}</h1><p className="detail-description">{selected.description}</p>
            <div className="detail-meta"><TimeLabel minutes={selected.minutes} /><span className="meta-unit"><Icon name="people" /> {selected.servings} servings</span><span className="meta-unit"><Icon name="book" /> {selected.steps.length} steps</span></div>
            <div className="detail-buttons"><button className="primary-button" onClick={() => cook(selected)}><Icon name="chef" /> Start cooking <Icon name="arrow" /></button><button className="secondary-icon" onClick={() => void share(selected)} aria-label="Share recipe"><Icon name="share" /></button></div>
            <div className="ingredients-head"><h2>Ingredients</h2><span>{completed}/{selected.ingredients.length} checked</span></div>
            <div className="serving-adjust"><span>Adjust servings</span><div><button disabled={servings <= 1} onClick={() => setServings(s => Math.max(1, s - 1))} aria-label="Fewer servings">−</button><b>{servings}</b><button onClick={() => setServings(s => Math.min(40, s + 1))} aria-label="More servings">+</button></div></div>
            <div className="ingredient-list">{selected.ingredients.map((line, i) => <label className={"ingredient " + (checks[selected.id + ":" + i] ? "ingredient-checked" : "")} key={i}><input type="checkbox" checked={!!checks[selected.id + ":" + i]} onChange={e => setChecks(old => ({ ...old, [selected.id + ":" + i]: e.target.checked }))}/><span className="check-ui"><Icon name="check" size={12} /></span><span>{scaledIngredient(line, factor)}</span></label>)}</div>
            <div className="detail-bottom"><button onClick={() => deleteRecipe(selected)}><Icon name="trash" size={16} /> Remove recipe</button>{selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">Original recipe ↗</a>}</div>
          </div>
        </div>
        <div className="overview-steps"><div><div className="eyebrow compact">THE GOOD PART</div><h2>What you&apos;ll do</h2></div><div>{selected.steps.map((step, i) => <div className="overview-step" key={step.id}><span>{String(i + 1).padStart(2, "0")}</span><p>{step.text}</p></div>)}</div></div>
      </div>}

      {screen === "cook" && selected && currentStep && <div className="cook-screen">
        <div className="shell cook-top"><button onClick={() => setScreen("recipe")} className="back-link"><Icon name="back" /> Exit cook mode</button><div className="cook-kicker"><span className="pulse-dot" /> YOU&apos;RE COOKING</div><button className="cook-timer-top" onClick={() => setTimerOpen(true)}><Icon name="timer" /> Timers {timers.length ? "(" + timers.length + ")" : ""}</button></div>
        <div className="shell cook-layout">
          <aside className="cook-aside"><RecipePhoto recipe={selected} className="aside-photo" /><div className="aside-name">ON THE MENU<h3>{selected.title}</h3><TimeLabel minutes={selected.minutes} /></div><div className="aside-divider"/><div className="aside-label">YOUR PROGRESS</div><div className="aside-steps">{selected.steps.map((step, i) => <button className={i === cookIndex ? "aside-step active" : "aside-step"} key={step.id} onClick={() => setCookIndex(i)}><span>{i < cookIndex ? <Icon name="check" size={14} /> : i + 1}</span><b>{i === cookIndex ? "Current step" : "Step " + (i + 1)}</b></button>)}</div></aside>
          <section className="cook-main">
            <div className="cook-progress-top"><span>STEP {cookIndex + 1} OF {selected.steps.length}</span><span>{Math.round((cookIndex + 1) / selected.steps.length * 100)}% complete</span></div>
            <div className="progress-track"><div style={{ width: ((cookIndex + 1) / selected.steps.length * 100) + "%" }}/></div>
            <div className="cook-current"><div className="step-badge">STEP {String(cookIndex + 1).padStart(2, "0")}</div><h1>{currentStep.text}</h1>{currentStep.seconds && <button className="suggested-timer" onClick={() => startTimer(currentStep.seconds!, "Step " + (cookIndex + 1))}><Icon name="timer" size={22} /><span>Start a {currentStep.seconds >= 3600 ? Math.round(currentStep.seconds / 3600) + " hour" : Math.round(currentStep.seconds / 60) + " minute"} timer</span><Icon name="plus" size={19} /></button>}</div>
            <div className="cook-navigation"><button className="previous-button" disabled={cookIndex === 0} onClick={() => setCookIndex(i => Math.max(0, i - 1))}><Icon name="back" /> Previous</button>{cookIndex === selected.steps.length - 1 ? <button className="next-button" onClick={() => setScreen("recipe")}><Icon name="check" /> Finish cooking</button> : <button className="next-button" onClick={() => setCookIndex(i => Math.min(selected.steps.length - 1, i + 1))}>Next step <Icon name="arrow" /></button>}</div>
            <div className="cook-next"><div className="next-small">UP NEXT</div>{selected.steps[cookIndex + 1]?.text || "You're almost ready to eat. Enjoy!"}</div>
          </section>
        </div>
        <div className="cook-bottom-tip">Little by little. Delicious things take time.</div>
      </div>}

      {importOpen && <div className="modal-scrim" onMouseDown={e => { if (e.target === e.currentTarget) setImportOpen(false); }}><div className="import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title"><button className="modal-close icon-button" onClick={() => setImportOpen(false)} aria-label="Close"><Icon name="close" /></button><div className="eyebrow compact">LET&apos;S MAKE SOMETHING GOOD</div><h2 id="import-title">Add to your cookbook<span className="brand-dot">.</span></h2><p className="modal-intro">Keep the recipe. Lose the clutter.</p><div className="tab-switch"><button className={importType === "url" ? "selected" : ""} onClick={() => { setImportType("url"); setImportError(""); }}><Icon name="link" size={17} /> From a link</button><button className={importType === "manual" ? "selected" : ""} onClick={() => { setImportType("manual"); setImportError(""); }}><Icon name="edit" size={17} /> Write my own</button></div>
        {importType === "url" ? <form onSubmit={e => void importRecipe(e)}><label className="field-label" htmlFor="import-url">RECIPE WEBSITE URL</label><input className="full-input" id="import-url" type="url" placeholder="https://www.example.com/your-favorite-recipe" required value={url} onChange={e => setUrl(e.target.value)} autoFocus/><button className="full-primary" disabled={importing || !url.trim()} type="submit">{importing ? "Finding your recipe…" : "Import recipe"} {!importing && <Icon name="arrow" />}</button><p className="form-note">Works with websites that publish recipe metadata. Some websites block imports.</p></form> : <form onSubmit={addManual} className="manual-form"><label className="field-label">RECIPE NAME<input className="full-input" required value={manual.title} onChange={e => setManual(m => ({...m,title:e.target.value}))} placeholder="My best weeknight dinner" /></label><div className="manual-row"><label className="field-label">MINUTES<input className="full-input" min="1" type="number" value={manual.minutes} onChange={e => setManual(m => ({...m,minutes:e.target.value}))}/></label><label className="field-label">SERVINGS<input className="full-input" min="1" type="number" value={manual.servings} onChange={e => setManual(m => ({...m,servings:e.target.value}))}/></label></div><label className="field-label">INGREDIENTS <small>(ONE PER LINE)</small><textarea className="full-input" rows={4} required placeholder={"2 tbsp olive oil\n1 onion, chopped"} value={manual.ingredients} onChange={e => setManual(m => ({...m,ingredients:e.target.value}))} /></label><label className="field-label">STEPS <small>(ONE PER LINE)</small><textarea className="full-input" rows={4} required placeholder={"Heat the oil in a skillet.\nAdd onions and cook until soft."} value={manual.steps} onChange={e => setManual(m => ({...m,steps:e.target.value}))}/></label><button className="full-primary" type="submit">Save my recipe <Icon name="arrow" /></button></form>}
        {importError && <div className="form-error" role="alert">{importError}</div>}
        </div></div>}

      {timerOpen && <div className="modal-scrim timer-scrim" onMouseDown={e => { if (e.target === e.currentTarget) setTimerOpen(false); }}><div className="timer-panel" role="dialog" aria-modal="true" aria-labelledby="timers-title"><div className="panel-title"><div><div className="eyebrow compact">KEEP EVERYTHING MOVING</div><h2 id="timers-title">Kitchen timers</h2></div><button className="icon-button" aria-label="Close timers" onClick={() => setTimerOpen(false)}><Icon name="close" /></button></div><div className="timer-list">{timers.length === 0 ? <div className="empty-timers"><Icon name="timer" size={34} /><h3>Perfect timing, every time.</h3><p>Start a timer from a recipe step, or set your own below.</p></div> : timers.map(t => <div className={"timer-row " + (t.endAt <= now ? "timer-done" : "")} key={t.id}><div><strong>{t.title}</strong><span>{t.endAt <= now ? "Time is up!" : "Keep an eye on this one"}</span></div><b>{formatTime((t.endAt - now) / 1000)}</b><button onClick={() => setTimers(ts => ts.filter(x => x.id !== t.id))} aria-label={"Remove timer " + t.title}><Icon name="close" size={17}/></button></div>)}</div><form className="custom-timer" onSubmit={e => { e.preventDefault(); startTimer(Math.max(1, Math.min(240, Number(customMinutes))) * 60, "Kitchen timer"); }}><label htmlFor="timer-minutes">SET A QUICK TIMER</label><div><input id="timer-minutes" type="number" min="1" max="240" value={customMinutes} onChange={e => setCustomMinutes(e.target.value)} aria-label="Minutes" /><span>min</span><button type="submit"><Icon name="plus" size={17}/> Start timer</button></div></form><p className="timer-note">Timers work while this page is open. Background alerts aren&apos;t guaranteed on iOS in this preview.</p></div></div>}

      {screen !== "cook" && <nav className="mobile-nav" aria-label="Mobile navigation"><button className={screen === "home" ? "active" : ""} onClick={() => setScreen("home")}><Icon name="book" /> Cookbook</button><button onClick={() => { setImportType("url"); setImportOpen(true); }}><Icon name="plus" /> Add recipe</button><button onClick={() => setTimerOpen(true)}><Icon name="timer" /> Timers {activeTimers > 0 ? "(" + activeTimers + ")" : ""}</button></nav>}
    </main>
  );
}