# StirCue

**Good food, right on cue.**

A mobile-first kitchen companion: capture recipes from supported websites, organize your favorites, plan dinners, shop, and follow step-by-step instructions without the clutter.

## Features (v0.2)
- **Recipe library:** import structured recipe metadata from URLs, or create a recipe manually
- **Favorites and search:** filter favorites and search by title, category, or ingredients
- **Recipe editor and notes:** change ingredient lists, instructions, servings, or details
- **Weekly dinner planner:** set a recipe for each night and create a grocery list from the plan
- **Grocery list:** one-tap add from a recipe, grouped by store section, with checkboxes and quick add
- **Cook Mode:** focused step navigation, remember last step, adjustable servings, multiple countdown timers, and browser text-to-speech
- **Privacy-first:** works without an account; data persists in the current browser's local storage
- **Portable backups:** export and restore recipes, favorites, notes, plan, groceries, and cooking progress as JSON
- **Installable experience:** web-app manifest and mobile-friendly styling for Add to Home Screen

## Development

```sh
npm install
npm run dev
npm run typecheck
npm run build
```

Requires Node.js 20 or newer. Deploy to Vercel as a Next.js project with root directory `./`.

## Data and limitations

Recipes, plans, and lists are **local to the browser and the hosting domain**. Vercel and Render do not share browser local storage. Use **Export backup** and **Restore backup** in the cookbook to migrate. No login or cloud sync in v0.2.

URL import reads schema.org Recipe JSON-LD from public recipe pages. Some websites lack structured metadata or block automated retrieval; manual entry is the fallback. Voice reads steps aloud with browser speech synthesis, not speech recognition. Timers run in the open browser session: background or lock-screen alerts are not guaranteed on iOS. Offline functionality is not yet guaranteed.

### Name
StirCue is a working name, not a completed trademark, domain, or App Store clearance.

## Deployment

Link `joestella99/Cook_mode` to Vercel. Pushes to `main` then build automatically. GitHub Actions checks TypeScript and Next.js compilation on commits.
