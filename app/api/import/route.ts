import { NextRequest, NextResponse } from "next/server";
import { load } from "cheerio";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { Recipe, Step } from "@/lib/recipes";

export const runtime = "nodejs";
export const maxDuration = 15;

function isPublicIp(ip: string): boolean {
  if (ip.includes(":")) {
    const x = ip.toLowerCase();
    return !(/^(::1|::|fc|fd|fe8|fe9|fea|feb)/.test(x) || x.startsWith("::ffff:") || x.startsWith("2001:db8"));
  }
  const nums = ip.split(".").map(Number);
  if (nums.length !== 4 || nums.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = nums;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || (a === 192 && b === 0) || (a === 198 && b === 51) || (a === 203 && b === 0));
}
async function safeUrl(input: string): Promise<URL> {
  const url = new URL(input);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port && !["80", "443"].includes(url.port)) throw new Error("Enter a normal http or https recipe link.");
  const host = url.hostname.toLowerCase();
  if (isIP(host) || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || !host.includes(".")) throw new Error("Please use a public recipe website.");
  const addresses = await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(a => !isPublicIp(a.address))) throw new Error("That address cannot be imported.");
  return url;
}
async function getHtml(input: string): Promise<{ html: string; finalUrl: string }> {
  let url = await safeUrl(input);
  for (let n = 0; n < 4; n++) {
    const response = await fetch(url.toString(), {
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MiseRecipeReader/1.0)", Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(9000),
      cache: "no-store"
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The website redirected without a destination.");
      url = await safeUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error("That website blocked the import. Try another link or add the recipe manually.");
    const type = response.headers.get("content-type") || "";
    if (!type.includes("html")) throw new Error("That link doesn't appear to be a recipe webpage.");
    if (Number(response.headers.get("content-length") || "0") > 2000000) throw new Error("The recipe page is too large.");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Could not read that webpage.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2000000) { await reader.cancel(); throw new Error("The recipe page is too large."); }
      chunks.push(value);
    }
    return { html: new TextDecoder().decode(Buffer.concat(chunks)), finalUrl: url.toString() };
  }
  throw new Error("Too many redirects from that recipe website.");
}
function plain(v: unknown): string {
  if (typeof v === "string") return v.trim().replace(/<[^>]*>/g, "").replace(/\s+/g, " ");
  if (typeof v === "number") return String(v);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return plain(o.text ?? o.name ?? o.value ?? "");
  }
  return "";
}
function findRecipe(root: unknown): Record<string, unknown> | null {
  if (!root || typeof root !== "object") return null;
  if (Array.isArray(root)) {
    for (const v of root) { const found = findRecipe(v); if (found) return found; }
    return null;
  }
  const o = root as Record<string, unknown>;
  const type = o["@type"];
  if (type === "Recipe" || Array.isArray(type) && type.includes("Recipe")) return o;
  for (const key of ["@graph", "mainEntity", "itemListElement"]) {
    if (o[key]) { const found = findRecipe(o[key]); if (found) return found; }
  }
  return null;
}
function stepsFrom(value: unknown): string[] {
  if (typeof value === "string") return value.split(/\n+/).map(plain).filter(Boolean);
  if (Array.isArray(value)) return value.flatMap(stepsFrom);
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (o.itemListElement) return stepsFrom(o.itemListElement);
    if (o.steps) return stepsFrom(o.steps);
    const text = plain(o.text || o.name || "");
    return text ? [text] : [];
  }
  return [];
}
function secondsInStep(text: string): number | undefined {
  const match = text.match(/(?:for|about|around|approximately|roughly)\s+(\d{1,3})(?:\s*[-–]\s*\d+)?\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/i);
  if (!match) return undefined;
  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  return n * (unit.startsWith("h") ? 3600 : unit.startsWith("m") ? 60 : 1);
}
function minutesFrom(iso: unknown): number {
  if (typeof iso !== "string") return 0;
  const m = iso.match(/P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (m && (m[1] || m[2])) return Number(m[1] || 0) * 60 + Number(m[2] || 0);
  const num = iso.match(/\d+/);
  return num ? Number(num[0]) : 0;
}
function imageFrom(image: unknown): string {
  if (Array.isArray(image)) return imageFrom(image[0]);
  if (typeof image === "string") return /^https?:\/\//i.test(image) ? image : "";
  if (image && typeof image === "object") return imageFrom((image as Record<string, unknown>).url ?? (image as Record<string, unknown>).contentUrl);
  return "";
}
function yieldFrom(value: unknown): number {
  const first = Array.isArray(value) ? value[0] : value;
  const n = Number(plain(first).match(/\d+/)?.[0] || 0);
  return n > 0 && n < 100 ? n : 4;
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { url?: unknown };
    if (typeof body.url !== "string" || body.url.length > 2048) return NextResponse.json({ error: "Paste a valid recipe URL." }, { status: 400 });
    const { html, finalUrl } = await getHtml(body.url);
    const $ = load(html);
    let data: Record<string, unknown> | null = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      if (data) return;
      try { data = findRecipe(JSON.parse($(el).html() || "")); } catch { /* ignore malformed metadata */ }
    });
    if (!data) return NextResponse.json({ error: "No structured recipe found on this page. Try another website or add it manually." }, { status: 422 });
    const raw = data as Record<string, unknown>;
    const ingredients = Array.isArray(raw.recipeIngredient) ? raw.recipeIngredient.map(plain).filter(Boolean) : [];
    const instructions = stepsFrom(raw.recipeInstructions);
    if (!plain(raw.name) || ingredients.length === 0 || instructions.length === 0) return NextResponse.json({ error: "This page has incomplete recipe information. Add it manually instead." }, { status: 422 });
    const total = minutesFrom(raw.totalTime) || minutesFrom(raw.prepTime) + minutesFrom(raw.cookTime);
    const recipe: Recipe = {
      id: crypto.randomUUID(),
      title: plain(raw.name).slice(0, 140),
      description: plain(raw.description).slice(0, 240),
      image: imageFrom(raw.image),
      sourceUrl: finalUrl,
      sourceName: new URL(finalUrl).hostname.replace(/^www\./, ""),
      minutes: total || 30,
      servings: yieldFrom(raw.recipeYield),
      ingredients: ingredients.slice(0, 80).map(x => x.slice(0, 350)),
      steps: instructions.slice(0, 50).map((text, i): Step => ({ id: "step-" + i, text: text.slice(0, 1200), seconds: secondsInStep(text) })),
      category: "From the web",
      createdAt: Date.now()
    };
    return NextResponse.json({ recipe });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't import this recipe.";
    return NextResponse.json({ error: message.includes("fetch failed") || message.includes("timeout") ? "Couldn't reach that website. Try another recipe link." : message }, { status: 400 });
  }
}