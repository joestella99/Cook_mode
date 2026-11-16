"use client";

import { useEffect, useMemo, useState } from "react";
import { createGroceries, groceryGroup, MEAL_DAYS, parseRecipeFromBackup, type GroceryItem, type MealPlan, type CookProgress } from "../lib/experience";
import { formatTime, scaledIngredient, starterRecipes, type Recipe } from "../lib/recipes";

type Screen = "home" | "recipe" | "cook" | "groceries" | "planner";
type Timer = { id: string; title: string; endAt: number; duration: number };
const LIBRARY_KEY = "mise:library:v1";
const CHECKS_KEY = "mise:checks:v1";
const TIMER_KEY = "mise:timers:v1";
const FAVORITES_KEY = "stircue:favorites:v1";
const GROCERY_KEY = "stircue:groceries:v1";
const PLAN_KEY = "stircue:mealplan:v1";
const PROGRESS_KEY = "stircue:progress:v1";
const NOTES_KEY = "stircue:notes:v1";

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
    chef: <><path d="M6 14a5 5 0 0 1-1-9 5 5 0 0 1 9-1 5 5 0 1 1 5 9v7H6zM6 17h13" /></>,
    heart: <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/>,
    basket: <><path d="M3 10h18l-2 11H5zM8 10l4-7 4 7M9 14v4M15 14v4"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
    volume: <><path d="M4 9v6h4l5 4V5L8 9zM17 8a6 6 0 0 1 0 8"/></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/></>,
    upload: <><path d="M12 17V5m-4 4 4-4 4 4M4 17v4h16v-4"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>

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
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [groceries, setGroceries] = useState<GroceryItem[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan>({});
  const [progress, setProgress] = useState<CookProgress>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [groceryInput, setGroceryInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState({ title: "", description: "", category: "", minutes: "30", servings: "2", ingredients: "", steps: "" });
  const [dataMessage, setDataMessage] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const selected = recipes.find(r => r.id === selectedId) ?? recipes[0];
  const activeTimers = timers.filter(t => t.endAt > now).length;
  const visibleRecipes = useMemo(() => recipes.filter(r => (!onlyFavorites || favorites[r.id]) && (r.title + " " + r.category + " " + r.ingredients.join(" ")).toLowerCase().includes(search.toLowerCase())), [recipes, search, onlyFavorites, favorites]);
  const groceryGroups = useMemo(() => [...new Set(groceries.map(item => item.group))].sort((a, b) => a.localeCompare(b)), [groceries]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LIBRARY_KEY);
      if (stored) { const parsed: unknown = JSON.parse(stored); if (Array.isArray(parsed)) setRecipes(parsed as Recipe[]); }
      const savedChecks = localStorage.getItem(CHECKS_KEY);
      if (savedChecks) setChecks(JSON.parse(savedChecks));
      const savedTimers = localStorage.getItem(TIMER_KEY);
      if (savedTimers) setTimers(JSON.parse(savedTimers));
      const fav = localStorage.getItem(FAVORITES_KEY); if (fav) setFavorites(JSON.parse(fav));
      const list = localStorage.getItem(GROCERY_KEY); if (list) setGroceries(JSON.parse(list));
      const plan = localStorage.getItem(PLAN_KEY); if (plan) setMealPlan(JSON.parse(plan));
      const prog = localStorage.getItem(PROGRESS_KEY); if (prog) setProgress(JSON.parse(prog));
      const note = localStorage.getItem(NOTES_KEY); if (note) setNotes(JSON.parse(note));
    } catch { /* gracefully use starter recipes */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(LIBRARY_KEY, JSON.stringify(recipes)); }, [ready, recipes]);
  useEffect(() => { if (ready) localStorage.setItem(CHECKS_KEY, JSON.stringify(checks)); }, [ready, checks]);
  useEffect(() => { if (ready) localStorage.setItem(TIMER_KEY, JSON.stringify(timers)); }, [ready, timers]);
  useEffect(() => { if (ready) localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); }, [ready, favorites]);
  useEffect(() => { if (ready) localStorage.setItem(GROCERY_KEY, JSON.stringify(groceries)); }, [ready, groceries]);
  useEffect(() => { if (ready) localStorage.setItem(PLAN_KEY, JSON.stringify(mealPlan)); }, [ready, mealPlan]);
  useEffect(() => { if (ready) localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); }, [ready, progress]);
  useEffect(() => { if (ready) localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }, [ready, notes]);
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
    setCookIndex(progress[recipe.id] || 0);
    setScreen("cook");
    window.scrollTo(0, 0);
  }
  function goTo(screen: Screen) { setScreen(screen); window.scrollTo(0, 0); }
  function toggleFavorite(id: string) { setFavorites(old => ({ ...old, [id]: !old[id] })); }
  function addToGrocery(recipe: Recipe) {
    setGroceries(old => [...old, ...createGroceries(recipe, servings)]);
    goTo("groceries");
  }
  function addPlanGroceries() {
    const entries = Object.values(mealPlan).map(id => recipes.find(r => r.id === id)).filter((r): r is Recipe => !!r);
    if (!entries.length) { setDataMessage("Choose at least one dinner first."); return; }
    setGroceries(old => [...old, ...entries.flatMap(r => createGroceries(r))]);
    setDataMessage("");
    goTo("groceries");
  }
  function startEditing(recipe: Recipe) {
    setEditDraft({title:recipe.title, description:recipe.description, category:recipe.category, minutes:String(recipe.minutes), servings:String(recipe.servings), ingredients:recipe.ingredients.join("\n"), steps:recipe.steps.map(s => s.text).join("\n")});
    setEditing(true);
  }
  function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const ingredients = editDraft.ingredients.split("\n").map(v => v.trim()).filter(Boolean);
    const lines = editDraft.steps.split("\n").map(v => v.trim()).filter(Boolean);
    if (!ingredients.length || !lines.length || !editDraft.title.trim()) return;
    const newSteps = lines.map((text, i) => ({ id: "edited-" + i, text }));
    setRecipes(old => old.map(r => r.id === selected.id ? { ...r, title:editDraft.title.trim(), description:editDraft.description.trim(), category:editDraft.category.trim() || "My recipes", minutes: Math.max(1, Number(editDraft.minutes)||30), servings:Math.max(1, Number(editDraft.servings)||2), ingredients, steps:newSteps } : r));
    setServings(Math.max(1, Number(editDraft.servings)||2));
    setEditing(false);
  }
  function exportBackup() {
    const contents = JSON.stringify({version:2, app:"StirCue", exportedAt:new Date().toISOString(), recipes, favorites, groceries, mealPlan, notes, progress}, null, 2);
    const href = URL.createObjectURL(new Blob([contents], {type:"application/json"}));
    const a = document.createElement("a"); a.href=href; a.download="stircue-backup.json"; a.click(); URL.revokeObjectURL(href);
  }
  async function restoreBackup(file?: File) {
    if (!file || file.size > 5000000) { setDataMessage("Choose a backup under 5 MB."); return; }
    try {
      const data = JSON.parse(await file.text()) as Record<string, unknown>;
      if (data.app !== "StirCue" || !Array.isArray(data.recipes)) throw new Error("This isn't a StirCue backup.");
      const restored = parseRecipeFromBackup(data.recipes);
      if (!restored.length) throw new Error("There are no valid recipes in the backup.");
      if (!window.confirm("Replace the cookbook and saved lists on this device with the backup?")) return;
      setRecipes(restored);
      setFavorites(data.favorites && typeof data.favorites==="object" ? data.favorites as Record<string,boolean> : {});
      setGroceries(Array.isArray(data.groceries) ? data.groceries.filter(x => typeof x?.text === "string") as GroceryItem[] : []);
      setMealPlan(data.mealPlan && typeof data.mealPlan==="object" ? data.mealPlan as MealPlan : {});
      setNotes(data.notes && typeof data.notes==="object" ? data.notes as Record<string,string> : {});
      setProgress(data.progress && typeof data.progress==="object" ? data.progress as CookProgress : {});
      setDataMessage("Backup restored.");
    } catch (e) { setDataMessage(e instanceof Error ? e.message : "Couldn't read this backup."); }
  }
  function readStep(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = .91; utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
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
    setMealPlan(p => Object.fromEntries(Object.entries(p).filter(([, id]) => id !== recipe.id)));
    setScreen("home");
  }
  async function share(recipe: Recipe) {
    const shareData = { title: recipe.title, text: "A recipe from my StirCue cookbook", url: recipe.sourceUrl || location.href };
    try { if (navigator.share) await navigator.share(shareData); else await navigator.clipboard.writeText(shareData.url); }
    catch { /* user dismissed */ }
  }
  const completed = selected ? selected.ingredients.filter((_, i) => checks[selected.id + ":" + i]).length : 0;
  const factor = selected ? servings / selected.servings : 1;
  const currentStep = selected?.steps[cookIndex];
  useEffect(() => {
    if (ready && screen === "cook" && selected) setProgress(old => old[selected.id] === cookIndex ? old : ({ ...old, [selected.id]:cookIndex }));
  }, [cookIndex, screen, selected?.id, ready]);
  useEffect(() => {
    if (screen === "cook" && voiceEnabled && currentStep) readStep(currentStep.text);
    return () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); };
  }, [cookIndex, screen, voiceEnabled, selected?.id]);

  return (
    <main>
      <header className="site-header">
        <div className="shell header-inner">
          <button className="brand" onClick={() => setScreen("home")} aria-label="StirCue home"><span className="brand-icon">s<span className="brand-dot">.</span></span><span>stir<span className="word-accent">cue</span><span className="brand-dot">.</span></span></button>
          <nav className="top-nav" aria-label="Main navigation">
            <button className={screen === "home" ? "nav-active" : ""} onClick={() => setScreen("home")}>My cookbook</button>
            <button className={screen === "planner" ? "nav-active" : ""} onClick={() => goTo("planner")}>Meal planner</button>
            <button className={screen === "groceries" ? "nav-active" : ""} onClick={() => goTo("groceries")}>Groceries {groceries.filter(i => !i.done).length ? "(" + groceries.filter(i => !i.done).length + ")" : ""}</button>
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
            <h1>Good food.<br/><em>Right on cue.</em></h1>
            <p>Your recipes, dinner plans, groceries, and step-by-step cooking — together in one beautiful place.</p>
            <button className="hero-cta" onClick={() => { setImportError(""); setImportOpen(true); }}><Icon name="plus" size={20} /> Import your first recipe <Icon name="arrow" size={20} /></button>
            <div className="hero-sub"><Icon name="spark" size={17} /> Your kitchen sidekick. No account needed.</div>
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
          <div className="cookbook-toolbar">
            <button className={!onlyFavorites ? "pill active" : "pill"} onClick={() => setOnlyFavorites(false)}>All recipes</button>
            <button className={onlyFavorites ? "pill active" : "pill"} onClick={() => setOnlyFavorites(true)}><Icon name="heart" size={15}/> Favorites ({Object.values(favorites).filter(Boolean).length})</button>
            <button className="pill utility" onClick={() => goTo("planner")}><Icon name="calendar" size={15}/> Plan this week</button>
            <button className="pill utility" onClick={() => goTo("groceries")}><Icon name="basket" size={15}/> Grocery list</button>
          </div>
          <div className="recipe-grid">
            {visibleRecipes.map(recipe => <article className="recipe-card" key={recipe.id}><button className="recipe-card-target" onClick={() => viewRecipe(recipe)}>
              <RecipePhoto recipe={recipe} />
              <div className="recipe-card-body"><div className="card-category">{recipe.category}</div><div className="card-title-row"><h3>{recipe.title}</h3><span className="card-arrow"><Icon name="arrow" size={19} /></span></div><p>{recipe.description}</p><div className="card-meta"><TimeLabel minutes={recipe.minutes} /><span className="meta-unit"><Icon name="people" size={16} /> {recipe.servings} servings</span></div></div>
            </button><button className={"favorite-chip " + (favorites[recipe.id] ? "favorited" : "")} onClick={() => toggleFavorite(recipe.id)} aria-label={(favorites[recipe.id] ? "Remove " : "Favorite ") + recipe.title} aria-pressed={!!favorites[recipe.id]}><Icon name="heart" size={18} /></button></article>)}
            <button className="empty-card" onClick={() => { setImportType("url"); setImportOpen(true); }}><span className="empty-plus"><Icon name="plus" size={28} /></span><strong>Something missing?</strong><span>Bring another favorite to the table.</span><b>Add a recipe <Icon name="arrow" size={15} /></b></button>
          </div>
          {visibleRecipes.length === 0 && <p className="no-search">Nothing matched “{search}”. Try a different search.</p>}
        </section>
        <div className="data-tools"><div><strong>Your recipes belong to you.</strong><p>Export your cookbook to move it between devices or domains.</p></div><div className="data-tool-actions"><button onClick={exportBackup}><Icon name="download" size={16}/> Export backup</button><label className="restore-label"><Icon name="upload" size={16}/> Restore backup<input type="file" accept=".json,application/json" onChange={e => { void restoreBackup(e.target.files?.[0]); e.currentTarget.value = ""; }} /></label></div></div>
        {dataMessage && <p className="data-message" role="status">{dataMessage}</p>}
        <footer className="footer"><span>stircue<span className="brand-dot">.</span></span><span>Cook more. Scroll less. Made for the joy of it.</span><span>VERSION 0.2</span></footer>
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
            <div className="detail-buttons"><button className="primary-button" onClick={() => cook(selected)}><Icon name="chef" /> {progress[selected.id] ? "Resume cooking" : "Start cooking"} <Icon name="arrow" /></button><button className={"secondary-icon " + (favorites[selected.id] ? "heart-on" : "")} onClick={() => toggleFavorite(selected.id)} aria-pressed={!!favorites[selected.id]} aria-label="Toggle favorite"><Icon name="heart" /></button><button className="secondary-icon" onClick={() => void share(selected)} aria-label="Share recipe"><Icon name="share" /></button></div>
            <div className="recipe-action-strip">
              <button onClick={() => addToGrocery(selected)}><Icon name="basket" size={17}/> Add ingredients to groceries</button>
              <button onClick={() => startEditing(selected)}><Icon name="edit" size={17}/> Edit recipe</button>
            </div>
            <div className="ingredients-head"><h2>Ingredients</h2><span>{completed}/{selected.ingredients.length} checked</span></div>
            <div className="serving-adjust"><span>Adjust servings</span><div><button disabled={servings <= 1} onClick={() => setServings(s => Math.max(1, s - 1))} aria-label="Fewer servings">−</button><b>{servings}</b><button onClick={() => setServings(s => Math.min(40, s + 1))} aria-label="More servings">+</button></div></div>
            <div className="ingredient-list">{selected.ingredients.map((line, i) => <label className={"ingredient " + (checks[selected.id + ":" + i] ? "ingredient-checked" : "")} key={i}><input type="checkbox" checked={!!checks[selected.id + ":" + i]} onChange={e => setChecks(old => ({ ...old, [selected.id + ":" + i]: e.target.checked }))}/><span className="check-ui"><Icon name="check" size={12} /></span><span>{scaledIngredient(line, factor)}</span></label>)}</div>
            <div className="note-box"><label htmlFor="recipe-note">MY KITCHEN NOTES</label><textarea id="recipe-note" rows={3} value={notes[selected.id] || ""} onChange={e => setNotes(old => ({...old, [selected.id]:e.target.value}))} placeholder="Next time: extra lemon, less heat, add basil..." /><small>Private to this device · saved automatically</small></div>
            <div className="detail-bottom"><button onClick={() => deleteRecipe(selected)}><Icon name="trash" size={16} /> Remove recipe</button>{selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">Original recipe ↗</a>}</div>
          </div>
        </div>
        <div className="overview-steps"><div><div className="eyebrow compact">THE GOOD PART</div><h2>What you&apos;ll do</h2></div><div>{selected.steps.map((step, i) => <div className="overview-step" key={step.id}><span>{String(i + 1).padStart(2, "0")}</span><p>{step.text}</p></div>)}</div></div>
      </div>}

      {screen === "cook" && selected && currentStep && <div className="cook-screen">
        <div className="shell cook-top"><button onClick={() => { setVoiceEnabled(false); setScreen("recipe"); }} className="back-link"><Icon name="back" /> Exit cook mode</button><div className="cook-kicker"><span className="pulse-dot" /> YOU&apos;RE COOKING</div><button className="cook-timer-top" onClick={() => setTimerOpen(true)}><Icon name="timer" /> Timers {timers.length ? "(" + timers.length + ")" : ""}</button></div>
        <div className="shell cook-layout">
          <aside className="cook-aside"><RecipePhoto recipe={selected} className="aside-photo" /><div className="aside-name">ON THE MENU<h3>{selected.title}</h3><TimeLabel minutes={selected.minutes} /></div><div className="aside-divider"/><div className="aside-label">YOUR PROGRESS</div><div className="aside-steps">{selected.steps.map((step, i) => <button className={i === cookIndex ? "aside-step active" : "aside-step"} key={step.id} onClick={() => setCookIndex(i)}><span>{i < cookIndex ? <Icon name="check" size={14} /> : i + 1}</span><b>{i === cookIndex ? "Current step" : "Step " + (i + 1)}</b></button>)}</div></aside>
          <section className="cook-main">
            <div className="cook-progress-top"><span>STEP {cookIndex + 1} OF {selected.steps.length}</span><span>{Math.round((cookIndex + 1) / selected.steps.length * 100)}% complete</span></div>
            <div className="progress-track"><div style={{ width: ((cookIndex + 1) / selected.steps.length * 100) + "%" }}/></div>
            <div className="cook-current"><div className="cook-voice-actions"><button className={voiceEnabled ? "voice-pill active" : "voice-pill"} onClick={() => { setVoiceEnabled(v => !v); if (voiceEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel(); }}><Icon name="volume" size={17}/>{voiceEnabled ? "Auto read: on" : "Read steps aloud"}</button><button className="voice-pill" onClick={() => readStep(currentStep.text)}><Icon name="volume" size={16}/> Repeat step</button></div><div className="step-badge">STEP {String(cookIndex + 1).padStart(2, "0")}</div><h1>{currentStep.text}</h1>{currentStep.seconds && <button className="suggested-timer" onClick={() => startTimer(currentStep.seconds!, "Step " + (cookIndex + 1))}><Icon name="timer" size={22} /><span>Start a {currentStep.seconds >= 3600 ? Math.round(currentStep.seconds / 3600) + " hour" : Math.round(currentStep.seconds / 60) + " minute"} timer</span><Icon name="plus" size={19} /></button>}</div>
            <div className="cook-navigation"><button className="previous-button" disabled={cookIndex === 0} onClick={() => setCookIndex(i => Math.max(0, i - 1))}><Icon name="back" /> Previous</button>{cookIndex === selected.steps.length - 1 ? <button className="next-button" onClick={() => { setProgress(p => ({...p,[selected.id]:0})); setVoiceEnabled(false); setScreen("recipe"); }}><Icon name="check" /> Finish cooking</button> : <button className="next-button" onClick={() => setCookIndex(i => Math.min(selected.steps.length - 1, i + 1))}>Next step <Icon name="arrow" /></button>}</div>
            <div className="cook-next"><div className="next-small">UP NEXT</div>{selected.steps[cookIndex + 1]?.text || "You're almost ready to eat. Enjoy!"}</div>
          </section>
        </div>
        <div className="cook-bottom-tip">Little by little. Delicious things take time.</div>
      </div>}


      {screen === "planner" && <div className="shell workspace-page">
        <button className="back-link" onClick={() => goTo("home")}><Icon name="back"/> Back to cookbook</button>
        <div className="workspace-heading">
          <div><div className="eyebrow compact">A LITTLE PLANNING GOES A LONG WAY</div><h1>Dinner, <em>sorted.</em></h1><p>Pick what sounds good for each night. Build your grocery list from the week in one tap.</p></div>
          <button className="primary-button" onClick={addPlanGroceries}><Icon name="basket"/> Shop this week's dinners <Icon name="arrow"/></button>
        </div>
        <div className="meal-grid">
          {MEAL_DAYS.map((day, i) => {
            const planned = recipes.find(recipe => recipe.id === mealPlan[day]);
            return <div className={"meal-day " + (planned ? "planned" : "")} key={day}>
              <div className="meal-day-top"><span>{day.toUpperCase()}</span><b>{i === 0 ? "START THE WEEK" : i === 6 ? "SUNDAY RESET" : "DINNER"}</b></div>
              {planned ? <><RecipePhoto recipe={planned} className="meal-photo"/><h3>{planned.title}</h3><div className="meal-meta"><TimeLabel minutes={planned.minutes}/> · {planned.servings} servings</div></> : <div className="no-meal"><Icon name="plus" size={26}/><span>What's cooking?</span></div>}
              <label className="day-select-label" htmlFor={"meal-"+day}>Choose a recipe</label>
              <select id={"meal-"+day} className="meal-select" value={mealPlan[day] || ""} onChange={e => setMealPlan(p => ({ ...p, [day]: e.target.value }))}>
                <option value="">No recipe planned</option>
                {recipes.map(recipe => <option value={recipe.id} key={recipe.id}>{recipe.title}</option>)}
              </select>
              {planned && <button className="meal-view" onClick={() => viewRecipe(planned)}>View recipe <Icon name="arrow" size={15}/></button>}
            </div>;
          })}
        </div>
        <div className="planner-foot"><div><strong>{Object.values(mealPlan).filter(Boolean).length} dinners on the board</strong><p>Selections save on this device as you make them.</p></div><button onClick={() => { if (window.confirm("Clear your week’s dinner plan?")) setMealPlan({}); }}>Clear the week</button></div>
        {dataMessage && <p className="data-message" role="status">{dataMessage}</p>}
      </div>}

      {screen === "groceries" && <div className="shell workspace-page">
        <button className="back-link" onClick={() => goTo("home")}><Icon name="back"/> Back to cookbook</button>
        <div className="workspace-heading">
          <div><div className="eyebrow compact">EVERYTHING YOU NEED, NOTHING YOU DON'T</div><h1>The <em>grocery list.</em></h1><p>Add ingredients from any recipe, check things off in the store, and keep the little extras here too.</p></div>
          <div className="list-count"><Icon name="basket" size={19}/><strong>{groceries.filter(item => !item.done).length}</strong><span>left to get</span></div>
        </div>
        <div className="grocery-layout">
          <div className="grocery-content">
            {groceryGroups.length === 0 && <div className="grocery-empty"><Icon name="basket" size={40}/><h2>All good things start with a list.</h2><p>Open a recipe and tap “Add ingredients to groceries,” or jot something down on the right.</p><button className="primary-button" onClick={() => goTo("home")}>Browse recipes <Icon name="arrow"/></button></div>}
            {groceryGroups.map(group => <section className="grocery-group" key={group}><div className="grocery-group-head"><h2>{group}</h2><span>{groceries.filter(i => i.group === group && !i.done).length} remaining</span></div>
              {groceries.filter(item => item.group === group).map(item => <div className={"grocery-entry "+(item.done ? "done" : "")} key={item.id}>
                <label><input type="checkbox" checked={item.done} onChange={e => setGroceries(old => old.map(i => i.id === item.id ? {...i,done:e.target.checked} : i))}/><span className="check-ui"><Icon name="check" size={12}/></span><span className="grocery-entry-name">{item.text}<small>{item.source || "Added by you"}</small></span></label>
                <button aria-label={"Remove "+item.text} onClick={() => setGroceries(old => old.filter(i => i.id !== item.id))}><Icon name="close" size={16}/></button>
              </div>)}
            </section>)}
          </div>
          <aside className="grocery-sidebar">
            <h2>Add something</h2><p>Milk? Olive oil? That one thing you always forget?</p>
            <form onSubmit={e => { e.preventDefault(); const text=groceryInput.trim(); if (!text) return; setGroceries(old => [...old,{id:crypto.randomUUID(),text,done:false,group:groceryGroup(text)}]); setGroceryInput(""); }}>
              <label htmlFor="grocery-input">NEW ITEM</label><input id="grocery-input" placeholder="e.g. 2 lemons" value={groceryInput} onChange={e=>setGroceryInput(e.target.value)} required/>
              <button type="submit"><Icon name="plus" size={16}/> Add to list</button>
            </form>
            <div className="grocery-sidebar-actions"><button onClick={() => setGroceries(old => old.filter(i=>!i.done))} disabled={!groceries.some(i=>i.done)}>Clear checked items</button><button onClick={() => { if (groceries.length && window.confirm("Clear your entire grocery list?")) setGroceries([]); }} disabled={!groceries.length}>Clear entire list</button></div>
            <p className="privacy-hint">Your list is saved locally on this device.</p>
          </aside>
        </div>
      </div>}

      {editing && selected && <div className="modal-scrim" onMouseDown={e=>{ if (e.target===e.currentTarget) setEditing(false); }}>
        <div className="import-modal edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title">
          <button className="modal-close icon-button" onClick={()=>setEditing(false)} aria-label="Close recipe editor"><Icon name="close"/></button>
          <div className="eyebrow compact">MAKE IT YOUR OWN</div><h2 id="edit-title">Edit recipe<span className="brand-dot">.</span></h2>
          <form onSubmit={saveEdit} className="manual-form">
            <label className="field-label">NAME<input className="full-input" required value={editDraft.title} onChange={e=>setEditDraft(d=>({...d,title:e.target.value}))}/></label>
            <label className="field-label">DESCRIPTION<input className="full-input" value={editDraft.description} onChange={e=>setEditDraft(d=>({...d,description:e.target.value}))}/></label>
            <label className="field-label">CATEGORY<input className="full-input" value={editDraft.category} onChange={e=>setEditDraft(d=>({...d,category:e.target.value}))}/></label>
            <div className="manual-row">
              <label className="field-label">MINUTES<input className="full-input" type="number" min="1" required value={editDraft.minutes} onChange={e=>setEditDraft(d=>({...d,minutes:e.target.value}))}/></label>
              <label className="field-label">SERVINGS<input className="full-input" type="number" min="1" required value={editDraft.servings} onChange={e=>setEditDraft(d=>({...d,servings:e.target.value}))}/></label>
            </div>
            <label className="field-label">INGREDIENTS <small>(ONE PER LINE)</small><textarea className="full-input" rows={6} required value={editDraft.ingredients} onChange={e=>setEditDraft(d=>({...d,ingredients:e.target.value}))}/></label>
            <label className="field-label">STEPS <small>(ONE PER LINE)</small><textarea className="full-input" rows={8} required value={editDraft.steps} onChange={e=>setEditDraft(d=>({...d,steps:e.target.value}))}/></label>
            <button className="full-primary" type="submit">Save changes <Icon name="check" size={18}/></button>
          </form>
        </div>
      </div>}

      {importOpen && <div className="modal-scrim" onMouseDown={e => { if (e.target === e.currentTarget) setImportOpen(false); }}><div className="import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title"><button className="modal-close icon-button" onClick={() => setImportOpen(false)} aria-label="Close"><Icon name="close" /></button><div className="eyebrow compact">LET&apos;S MAKE SOMETHING GOOD</div><h2 id="import-title">Add to your cookbook<span className="brand-dot">.</span></h2><p className="modal-intro">Keep the recipe. Lose the clutter.</p><div className="tab-switch"><button className={importType === "url" ? "selected" : ""} onClick={() => { setImportType("url"); setImportError(""); }}><Icon name="link" size={17} /> From a link</button><button className={importType === "manual" ? "selected" : ""} onClick={() => { setImportType("manual"); setImportError(""); }}><Icon name="edit" size={17} /> Write my own</button></div>
        {importType === "url" ? <form onSubmit={e => void importRecipe(e)}><label className="field-label" htmlFor="import-url">RECIPE WEBSITE URL</label><input className="full-input" id="import-url" type="url" placeholder="https://www.example.com/your-favorite-recipe" required value={url} onChange={e => setUrl(e.target.value)} autoFocus/><button className="full-primary" disabled={importing || !url.trim()} type="submit">{importing ? "Finding your recipe…" : "Import recipe"} {!importing && <Icon name="arrow" />}</button><p className="form-note">Works with websites that publish recipe metadata. Some websites block imports.</p></form> : <form onSubmit={addManual} className="manual-form"><label className="field-label">RECIPE NAME<input className="full-input" required value={manual.title} onChange={e => setManual(m => ({...m,title:e.target.value}))} placeholder="My best weeknight dinner" /></label><div className="manual-row"><label className="field-label">MINUTES<input className="full-input" min="1" type="number" value={manual.minutes} onChange={e => setManual(m => ({...m,minutes:e.target.value}))}/></label><label className="field-label">SERVINGS<input className="full-input" min="1" type="number" value={manual.servings} onChange={e => setManual(m => ({...m,servings:e.target.value}))}/></label></div><label className="field-label">INGREDIENTS <small>(ONE PER LINE)</small><textarea className="full-input" rows={4} required placeholder={"2 tbsp olive oil\n1 onion, chopped"} value={manual.ingredients} onChange={e => setManual(m => ({...m,ingredients:e.target.value}))} /></label><label className="field-label">STEPS <small>(ONE PER LINE)</small><textarea className="full-input" rows={4} required placeholder={"Heat the oil in a skillet.\nAdd onions and cook until soft."} value={manual.steps} onChange={e => setManual(m => ({...m,steps:e.target.value}))}/></label><button className="full-primary" type="submit">Save my recipe <Icon name="arrow" /></button></form>}
        {importError && <div className="form-error" role="alert">{importError}</div>}
        </div></div>}

      {timerOpen && <div className="modal-scrim timer-scrim" onMouseDown={e => { if (e.target === e.currentTarget) setTimerOpen(false); }}><div className="timer-panel" role="dialog" aria-modal="true" aria-labelledby="timers-title"><div className="panel-title"><div><div className="eyebrow compact">KEEP EVERYTHING MOVING</div><h2 id="timers-title">Kitchen timers</h2></div><button className="icon-button" aria-label="Close timers" onClick={() => setTimerOpen(false)}><Icon name="close" /></button></div><div className="timer-list">{timers.length === 0 ? <div className="empty-timers"><Icon name="timer" size={34} /><h3>Perfect timing, every time.</h3><p>Start a timer from a recipe step, or set your own below.</p></div> : timers.map(t => <div className={"timer-row " + (t.endAt <= now ? "timer-done" : "")} key={t.id}><div><strong>{t.title}</strong><span>{t.endAt <= now ? "Time is up!" : "Keep an eye on this one"}</span></div><b>{formatTime((t.endAt - now) / 1000)}</b><button onClick={() => setTimers(ts => ts.filter(x => x.id !== t.id))} aria-label={"Remove timer " + t.title}><Icon name="close" size={17}/></button></div>)}</div><form className="custom-timer" onSubmit={e => { e.preventDefault(); startTimer(Math.max(1, Math.min(240, Number(customMinutes))) * 60, "Kitchen timer"); }}><label htmlFor="timer-minutes">SET A QUICK TIMER</label><div><input id="timer-minutes" type="number" min="1" max="240" value={customMinutes} onChange={e => setCustomMinutes(e.target.value)} aria-label="Minutes" /><span>min</span><button type="submit"><Icon name="plus" size={17}/> Start timer</button></div></form><p className="timer-note">Timers work while this page is open. Background alerts aren&apos;t guaranteed on iOS in this preview.</p></div></div>}

      {screen !== "cook" && <nav className="mobile-nav" aria-label="Mobile navigation"><button className={screen === "home" || screen === "recipe" ? "active" : ""} onClick={() => setScreen("home")}><Icon name="book" /> Recipes</button><button className={screen === "planner" ? "active" : ""} onClick={() => goTo("planner")}><Icon name="calendar" /> Plan</button><button onClick={() => { setImportType("url"); setImportOpen(true); }}><Icon name="plus" /> Add</button><button className={screen === "groceries" ? "active" : ""} onClick={() => goTo("groceries")}><Icon name="basket" /> Groceries</button><button onClick={() => setTimerOpen(true)}><Icon name="timer" /> Timers{activeTimers ? " · " + activeTimers : ""}</button></nav>}
    </main>
  );
}