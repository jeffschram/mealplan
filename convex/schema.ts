import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// Mealplan schema — WildFit-based seasonal meal planning.
//
// The app keys off a per-season food-eligibility matrix (see
// `_output/wildfit-research.md`). We model the four primary seasons
// (Spring / Summer / Autumn / Winter) for both eligibility and the
// calendar. The Mild Spring vs Deep Spring nuance (e.g. Middle Foods
// excluded in Deep Spring) is captured via `tier` + `notes` on foods
// rather than extra season enum values, keeping the model simple and
// editable in the UI.
export const seasonValidator = v.union(
  v.literal('Spring'),
  v.literal('Summer'),
  v.literal('Autumn'),
  v.literal('Winter'),
)

export default defineSchema({
  foods: defineTable({
    // Display name of the food, e.g. 'Kale', 'Chicken', 'Butternut squash'.
    name: v.string(),
    // Food category from the research, e.g. 'Proteins',
    // 'Leafy/Non-starchy Vegetables', 'Healthy Fats', 'Fruit',
    // 'Nuts & Seeds', 'Middle Foods (starchy/root)', 'Dairy',
    // 'Grains/Pseudograins', 'Avoid'.
    group: v.string(),
    // Seasons in which this food is allowed (the four primary seasons).
    seasonEligibility: v.array(seasonValidator),
    // Optional tier annotation, e.g. 'middle' for borderline "Middle Foods"
    // that are excluded in Deep Spring but allowed later.
    tier: v.optional(v.string()),
    // A single SHARED household rating (not per-person).
    rating: v.union(
      v.literal('like'),
      v.literal('neutral'),
      v.literal('yuck'),
    ),
    // True when the season-eligibility is inferred/unverified — i.e. derived
    // from the Autumn/Winter paywalled rows in the research (provisional data).
    provisional: v.boolean(),
    // Optional freeform notes, e.g. substitution or timing rules.
    notes: v.optional(v.string()),
  }).index('by_group', ['group']),

  seasonsCalendar: defineTable({
    // Epoch ms of the Monday that starts this week (Monday-aligned).
    weekStartDate: v.number(),
    // Calendar year of the week's Monday.
    year: v.number(),
    // ISO-ish week number within the year.
    weekNumber: v.number(),
    // The WildFit season assigned to this week.
    season: seasonValidator,
  }).index('by_weekStart', ['weekStartDate']),

  // A generated meal plan covering a short window of days (see the cadence
  // helper). Produced either by the in-app deterministic generator
  // (generatedBy 'rule') or the scheduled Claude routine ('claude-routine'),
  // both of which write through convex/mealPlans.ts:submitMealPlan.
  mealPlans: defineTable({
    // Season the plan was generated for, e.g. 'Spring'.
    season: v.string(),
    // The days this plan covers.
    coveredDays: v.array(
      v.object({
        // ISO date, 'YYYY-MM-DD'.
        date: v.string(),
        // Weekday label, e.g. 'Monday'.
        label: v.string(),
      }),
    ),
    // Denormalized flat list of covered ISO dates. getPlanForDate scans the
    // most-recent plans (via by_createdAt) and matches on this field, so the
    // Today view resolves the active plan for a date without unpacking
    // coveredDays on every row.
    coveredDates: v.array(v.string()),
    // Make-ahead components prepped in batch for the window.
    mealPrepBatch: v.array(
      v.object({
        name: v.string(),
        sourceFoods: v.array(v.string()),
        quantityFor2People: v.string(),
        prepSteps: v.array(v.string()),
      }),
    ),
    // Aggregated shopping list.
    shoppingList: v.array(
      v.object({
        item: v.string(),
        quantity: v.string(),
      }),
    ),
    // Per covered day: each meal is an array of mealPrepBatch component names.
    dailyMeals: v.array(
      v.object({
        date: v.string(),
        breakfast: v.array(v.string()),
        lunch: v.array(v.string()),
        dinner: v.array(v.string()),
      }),
    ),
    // Which producer generated this plan.
    generatedBy: v.union(v.literal('rule'), v.literal('claude-routine')),
    createdAt: v.number(),
  })
    // Order plans newest-first so getPlanForDate can scan recent plans and
    // return the freshest one whose coveredDates include the target date.
    .index('by_createdAt', ['createdAt']),
})
