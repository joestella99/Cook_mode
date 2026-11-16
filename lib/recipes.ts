export type Step = { id: string; text: string; seconds?: number };
export type Recipe = {
  id: string;
  title: string;
  description: string;
  image: string;
  sourceUrl?: string;
  sourceName: string;
  minutes: number;
  servings: number;
  ingredients: string[];
  steps: Step[];
  category: string;
  createdAt: number;
};
export const starterRecipes: Recipe[] = [
  {
    id: "sample-pasta",
    title: "Lemony garlic pasta",
    description: "Silky, bright, and absurdly good for a Tuesday night.",
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1100&q=85",
    sourceName: "StirCue kitchen",
    minutes: 20,
    servings: 2,
    category: "Weeknight favorite",
    createdAt: 3,
    ingredients: ["200 g spaghetti", "3 tbsp unsalted butter", "3 cloves garlic, thinly sliced", "1 lemon, zest and juice", "1/2 cup freshly grated parmesan", "1/4 tsp red pepper flakes", "1/4 cup reserved pasta water", "Salt and freshly cracked pepper", "Fresh parsley, to finish"],
    steps: [
      { id: "p1", text: "Bring a large pot of generously salted water to a boil. Add the spaghetti and cook until just shy of al dente.", seconds: 600 },
      { id: "p2", text: "Before draining, scoop out at least 1 cup of starchy pasta water. Drain the pasta." },
      { id: "p3", text: "Melt the butter in a large skillet over medium-low heat. Add the sliced garlic and red pepper flakes. Stir gently until fragrant and golden, not browned.", seconds: 120 },
      { id: "p4", text: "Add the pasta, lemon zest, lemon juice, and a splash of pasta water. Toss vigorously until the butter and water become a glossy sauce." },
      { id: "p5", text: "Turn off the heat. Add parmesan a little at a time, tossing until silky. Loosen with more pasta water as needed." },
      { id: "p6", text: "Taste for salt and pepper. Finish with parsley, extra parmesan, and a little more lemon zest. Serve immediately." }
    ]
  },
  {
    id: "sample-salmon",
    title: "Crispy salmon bowls",
    description: "Warm rice, crunchy cucumber, a little heat.",
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=1100&q=85",
    sourceName: "StirCue kitchen",
    minutes: 30,
    servings: 2,
    category: "High protein",
    createdAt: 2,
    ingredients: ["2 salmon fillets (about 150 g each)", "1 cup dry jasmine rice", "1 cucumber, thinly sliced", "1 avocado, sliced", "2 tbsp soy sauce", "1 tbsp honey", "1 tsp toasted sesame oil", "1 tbsp neutral oil", "2 tbsp mayonnaise", "1 tsp sriracha", "Sesame seeds and lime to finish"],
    steps: [
      { id: "s1", text: "Rinse the rice until the water runs mostly clear. Cook according to the package instructions.", seconds: 900 },
      { id: "s2", text: "Pat the salmon dry. Whisk soy sauce, honey, and sesame oil in a small bowl." },
      { id: "s3", text: "Heat neutral oil in a skillet over medium-high heat. Cook salmon skin side down until crisp.", seconds: 240 },
      { id: "s4", text: "Flip the salmon, add the glaze, and cook until the fish is done to your liking.", seconds: 180 },
      { id: "s5", text: "Mix mayonnaise and sriracha. Slice cucumber and avocado." },
      { id: "s6", text: "Spoon rice into bowls, add salmon, cucumber, and avocado. Drizzle with spicy mayo, sesame seeds, and lime." }
    ]
  },
  {
    id: "sample-chickpeas",
    title: "Smoky chickpea skillet",
    description: "A pantry dinner that doesn't taste like one.",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1100&q=85",
    sourceName: "StirCue kitchen",
    minutes: 25,
    servings: 3,
    category: "One-pan dinner",
    createdAt: 1,
    ingredients: ["2 cans chickpeas, drained", "1 red onion, diced", "3 cloves garlic, minced", "2 tbsp olive oil", "2 tbsp harissa paste", "1 can crushed tomatoes (400 g)", "2 big handfuls baby spinach", "1/2 tsp smoked paprika", "Salt and pepper", "Greek yogurt and flatbread, to serve"],
    steps: [
      { id: "c1", text: "Heat olive oil in a large skillet over medium heat. Add onion and soften, stirring occasionally.", seconds: 300 },
      { id: "c2", text: "Add garlic, harissa, and smoked paprika. Stir until fragrant.", seconds: 60 },
      { id: "c3", text: "Add chickpeas and crushed tomatoes. Season and simmer gently until thickened.", seconds: 600 },
      { id: "c4", text: "Fold in spinach and let it wilt into the sauce.", seconds: 90 },
      { id: "c5", text: "Taste, adjust seasoning, and spoon into bowls. Serve with yogurt and warm flatbread." }
    ]
  }
];
export function scaledIngredient(line: string, factor: number): string {
  if (factor === 1) return line;
  const match = line.match(/^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\b/);
  if (!match) return line;
  const raw = match[1];
  const fraction = (v: string) => v.includes("/") ? Number(v.split("/")[0]) / Number(v.split("/")[1]) : Number(v);
  const amount = raw.split(" ").reduce((a, v) => a + fraction(v), 0) * factor;
  const display = Math.round(amount * 100) / 100;
  return String(display) + line.slice(match[0].length);
}
export function formatTime(s: number): string {
  const t = Math.max(0, Math.ceil(s));
  return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
}