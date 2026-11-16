import { scaledIngredient, type Recipe } from "./recipes";

export type GroceryItem = {
  id: string;
  text: string;
  done: boolean;
  source?: string;
  group: string;
};

export type MealPlan = Record<string, string>;
export type CookProgress = Record<string, number>;

const AISLES: [string, RegExp][] = [
  ["Produce", /\b(garlic|onion|lemon|lime|apple|avocado|tomato|parsley|basil|cilantro|ginger|spinach|pepper|lettuce|cucumber|potato|carrot|zucchini|mushroom|broccoli|asparagus|berry|berries)\b/i],
  ["Meat & seafood", /\b(chicken|salmon|beef|steak|shrimp|fish|turkey|pork|bacon|sausage|lamb)\b/i],
  ["Dairy & eggs", /\b(butter|cream|milk|cheese|parmesan|yogurt|egg|feta|mozzarella)\b/i],
  ["Bakery & grains", /\b(bread|rice|pasta|spaghetti|flour|tortilla|noodle|rolls|oats)\b/i],
  ["Pantry & spices", /\b(oil|salt|paprika|pepper flakes|flour|soy sauce|honey|chickpea|tomato paste|cumin|vinegar|sriracha)\b/i],
];

export function groceryGroup(text: string) {
  return AISLES.find(([, pattern]) => pattern.test(text))?.[0] ?? "Other";
}

export function createGroceries(recipe: Recipe, servings = recipe.servings): GroceryItem[] {
  return recipe.ingredients.map((ingredient) => ({
    id: crypto.randomUUID(),
    text: scaledIngredient(ingredient, servings / recipe.servings),
    done: false,
    source: recipe.title,
    group: groceryGroup(ingredient)
  }));
}

export const MEAL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function parseRecipeFromBackup(value: unknown): Recipe[] {
  if (!Array.isArray(value)) throw new Error("That backup doesn't contain a recipe collection.");
  return value.filter((r): r is Recipe => {
    if (!r || typeof r !== "object" || typeof r.id !== "string" || typeof r.title !== "string") return false;
    return Array.isArray(r.ingredients) && r.ingredients.every((x: unknown) => typeof x === "string")
      && Array.isArray(r.steps) && r.steps.every((s: {text?: unknown} ) => typeof s?.text === "string");
  }).slice(0, 500);
}
