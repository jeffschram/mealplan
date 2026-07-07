// Pure, deterministic rule-based meal-plan generator.
//
// NO Convex imports and NO AI/LLM calls — given the output of
// getGenerationContext it assembles a valid MealPlan entirely offline. This is
// what guarantees the app works with zero external AI; the scheduled Claude
// routine is an ALTERNATIVE producer that writes through the same mutation.
//
// Strategy:
//   1. Bucket eligibleFoods into protein / vegetable / fat / other by group.
//   2. Within each bucket, sort 'like' before 'neutral' (yuck is already
//      excluded upstream) for a stable, preference-weighted order.
//   3. Rotate selections across the covered days for variety.
//   4. Build meal-prep components (2-person quantities + simple prep steps).
//   5. Assemble Breakfast / Lunch / Dinner per covered day from those
//      components, and aggregate a de-duplicated shopping list.

import type { CoveredDay } from './cadence'
import type {
  DailyMeal,
  EligibleFood,
  MealPlan,
  MealPrepComponent,
  Rating,
  ShoppingListItem,
} from './plan'

export type GenerationContext = {
  season: string
  targetWindow: { coveredDays: CoveredDay[] }
  eligibleFoods: EligibleFood[]
}

export type Bucket = 'protein' | 'vegetable' | 'fat' | 'other'

/** Map a food `group` string onto one of the four generator buckets. */
export function bucketForGroup(group: string): Bucket {
  const g = group.toLowerCase()
  if (g.includes('protein')) return 'protein'
  if (g.includes('fat')) return 'fat'
  if (g.includes('vegetable') || g.includes('starchy') || g.includes('root')) {
    return 'vegetable'
  }
  return 'other'
}

const RATING_WEIGHT: Record<Rating, number> = { like: 0, neutral: 1, yuck: 2 }

/**
 * Bucket eligible foods and sort each bucket 'like' first, then 'neutral',
 * tie-broken alphabetically for determinism.
 */
export function bucketFoods(
  foods: EligibleFood[],
): Record<Bucket, EligibleFood[]> {
  const buckets: Record<Bucket, EligibleFood[]> = {
    protein: [],
    vegetable: [],
    fat: [],
    other: [],
  }
  for (const f of foods) buckets[bucketForGroup(f.group)].push(f)
  for (const key of Object.keys(buckets) as Bucket[]) {
    buckets[key].sort(
      (a, b) =>
        RATING_WEIGHT[a.rating] - RATING_WEIGHT[b.rating] ||
        a.name.localeCompare(b.name),
    )
  }
  return buckets
}

/**
 * Rotating picker: returns `count` items starting at `offset` (wrapping) so
 * consecutive days draw different items for variety. Empty list → empty result.
 */
function rotate<T>(items: T[], offset: number, count: number): T[] {
  if (items.length === 0) return []
  const out: T[] = []
  for (let i = 0; i < count && i < items.length; i++) {
    out.push(items[(offset + i) % items.length])
  }
  return out
}

// ── Component builders (2-person quantities + simple prep steps) ─────────────

function proteinComponent(food: EligibleFood): MealPrepComponent {
  return {
    name: `Batch ${food.name}`,
    sourceFoods: [food.name],
    quantityFor2People: '1.5 lb',
    prepSteps: [
      `Season the ${food.name.toLowerCase()} with salt and pepper.`,
      `Cook thoroughly (sheet-pan or skillet) and portion into servings.`,
      `Cool, then refrigerate in an airtight container.`,
    ],
  }
}

function roastedVegComponent(veg: EligibleFood[]): MealPrepComponent {
  const names = veg.map((v) => v.name)
  return {
    name: `Roasted ${names.join(' & ')}`,
    sourceFoods: names,
    quantityFor2People: '6 cups chopped',
    prepSteps: [
      `Chop ${names.join(', ').toLowerCase()} into bite-size pieces.`,
      `Toss with cooking fat, salt, and pepper.`,
      `Roast at 425°F for 25–30 min until tender; store refrigerated.`,
    ],
  }
}

function saladComponent(veg: EligibleFood[]): MealPrepComponent {
  const names = veg.map((v) => v.name)
  return {
    name: `${names.join(' & ')} salad base`,
    sourceFoods: names,
    quantityFor2People: '4 cups',
    prepSteps: [
      `Wash and chop ${names.join(', ').toLowerCase()}.`,
      `Store undressed in an airtight container; dress just before serving.`,
    ],
  }
}

function fatComponent(fat: EligibleFood): MealPrepComponent {
  return {
    name: `${fat.name} dressing`,
    sourceFoods: [fat.name],
    quantityFor2People: '1 cup',
    prepSteps: [
      `Whisk ${fat.name.toLowerCase()} with lemon juice, salt, and pepper.`,
      `Store refrigerated; shake before use.`,
    ],
  }
}

/**
 * Assemble a full, valid meal plan from a generation context. Deterministic:
 * identical input always yields identical output.
 */
export function generatePlan(ctx: GenerationContext): MealPlan {
  const coveredDays = ctx.targetWindow.coveredDays
  const buckets = bucketFoods(ctx.eligibleFoods)

  // ── Build a shared meal-prep batch for the window ──────────────────────────
  const components: MealPrepComponent[] = []

  // Protein components: one per covered day (rotating) so each day has a
  // distinct protein, capped at the number of proteins available.
  const proteinPicks = rotate(
    buckets.protein,
    0,
    Math.min(coveredDays.length, Math.max(buckets.protein.length, 1)),
  )
  const proteinComponents = proteinPicks.map(proteinComponent)
  components.push(...proteinComponents)

  // Roasted-veg component (first 2 veg) + salad base (next 2 veg).
  const roastVeg = rotate(buckets.vegetable, 0, 2)
  const saladVeg = rotate(buckets.vegetable, 2, 2)
  const roastComponent = roastVeg.length > 0 ? roastedVegComponent(roastVeg) : null
  const saladBase = saladVeg.length > 0 ? saladComponent(saladVeg) : null
  if (roastComponent) components.push(roastComponent)
  if (saladBase) components.push(saladBase)

  // Fat/dressing component.
  const fatPick = buckets.fat[0]
  const dressing = fatPick ? fatComponent(fatPick) : null
  if (dressing) components.push(dressing)

  // ── Assemble daily Breakfast / Lunch / Dinner from the components ──────────
  const dailyMeals: DailyMeal[] = coveredDays.map((day, i) => {
    // Each day gets a rotating protein (falls back to any available).
    const protein =
      proteinComponents.length > 0
        ? proteinComponents[i % proteinComponents.length]
        : undefined

    const breakfast: string[] = []
    const lunch: string[] = []
    const dinner: string[] = []

    if (protein) {
      breakfast.push(protein.name)
      lunch.push(protein.name)
      dinner.push(protein.name)
    }
    if (saladBase) {
      breakfast.push(saladBase.name)
      lunch.push(saladBase.name)
    }
    if (roastComponent) {
      lunch.push(roastComponent.name)
      dinner.push(roastComponent.name)
    }
    if (dressing) {
      lunch.push(dressing.name)
      dinner.push(dressing.name)
    }

    return {
      date: day.date,
      breakfast,
      lunch,
      dinner,
    }
  })

  // ── Aggregate a de-duplicated shopping list from every source food ─────────
  const seen = new Map<string, ShoppingListItem>()
  for (const c of components) {
    for (const food of c.sourceFoods) {
      if (!seen.has(food)) {
        seen.set(food, { item: food, quantity: shoppingQuantity(c) })
      }
    }
  }
  const shoppingList = Array.from(seen.values()).sort((a, b) =>
    a.item.localeCompare(b.item),
  )

  return {
    season: ctx.season,
    coveredDays,
    mealPrepBatch: components,
    shoppingList,
    dailyMeals,
    generatedBy: 'rule',
  }
}

/** Derive a rough shopping quantity string from a component's batch size. */
function shoppingQuantity(c: MealPrepComponent): string {
  // One-liner heuristic: reuse the component's 2-person quantity as the buy
  // amount when it references a single food; otherwise a sensible default.
  if (c.sourceFoods.length === 1) return c.quantityFor2People
  return '1 portion'
}
