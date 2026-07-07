import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { computeTargetWindow } from './lib/cadence'
import type { EligibleFood } from './lib/plan'

// The meal-plan engine's read/write surface. These functions are called by
// BOTH the in-app deterministic generator (via the React client) AND the
// scheduled Claude routine (via `npx convex run mealPlans:<fn>`). There is NO
// AI/LLM call in this file — AI generation happens in the separate routine,
// which produces a plan and writes it through submitMealPlan just like the app.

// Shared validators for a full plan payload (used by submitMealPlan).
const coveredDayValidator = v.object({
  date: v.string(),
  label: v.string(),
})
const mealPrepComponentValidator = v.object({
  name: v.string(),
  sourceFoods: v.array(v.string()),
  quantityFor2People: v.string(),
  prepSteps: v.array(v.string()),
})
const shoppingItemValidator = v.object({
  item: v.string(),
  quantity: v.string(),
})
const dailyMealValidator = v.object({
  date: v.string(),
  breakfast: v.array(v.string()),
  lunch: v.array(v.string()),
  dinner: v.array(v.string()),
})

const overrideValidator = v.optional(
  v.object({
    dates: v.optional(v.array(v.string())),
    anchorDay: v.optional(
      v.union(v.literal('friday'), v.literal('monday')),
    ),
  }),
)

// ── Season resolution ────────────────────────────────────────────────────────

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Resolve the season for a target ISO date by matching it against the
 * seasonsCalendar. We match the week window [weekStartDate, weekStartDate + 7d)
 * that CONTAINS the date. This is alignment-agnostic (works whether weeks are
 * Sunday- or Monday-aligned) because it tests a real timestamp against each
 * week's window rather than assuming a boundary.
 */
async function resolveSeasonForDate(
  ctx: { db: { query: (t: 'seasonsCalendar') => any } },
  isoDate: string,
): Promise<string | null> {
  const [y, m, d] = isoDate.split('-').map(Number)
  const target = Date.UTC(y, m - 1, d) + 12 * 60 * 60 * 1000 // midday, avoids DST edges
  const weeks: Doc<'seasonsCalendar'>[] = await ctx.db
    .query('seasonsCalendar')
    .withIndex('by_weekStart')
    .collect()

  // Convert the stored (local-midnight) weekStartDate to a comparable window.
  let best: { season: string; start: number } | null = null
  for (const w of weeks) {
    if (target >= w.weekStartDate && target < w.weekStartDate + WEEK_MS) {
      return w.season
    }
    // Track nearest earlier week as a fallback for dates just outside a window.
    if (w.weekStartDate <= target && (!best || w.weekStartDate > best.start)) {
      best = { season: w.season, start: w.weekStartDate }
    }
  }
  return best?.season ?? weeks[0]?.season ?? null
}

// ── 1. getGenerationContext ──────────────────────────────────────────────────

/**
 * Read-only context for producing a plan. Read by BOTH the in-app button and
 * the scheduled Claude routine (`npx convex run mealPlans:getGenerationContext`).
 * Resolves the season for the target window, computes the cadence window, and
 * returns the eligible (season-matched, non-yuck) foods.
 */
export const getGenerationContext = query({
  args: {
    referenceDate: v.optional(v.string()),
    override: overrideValidator,
  },
  handler: async (ctx, { referenceDate, override }) => {
    const targetWindow = computeTargetWindow(referenceDate, { override })

    // Season is driven by the first covered day (all covered days sit within
    // one planning week, so any of them resolves to the same season).
    const seasonDate =
      targetWindow.coveredDays[0]?.date ??
      referenceDate ??
      new Date().toISOString().slice(0, 10)
    const season = (await resolveSeasonForDate(ctx, seasonDate)) ?? 'Spring'

    const allFoods = await ctx.db.query('foods').collect()
    const eligibleFoods: EligibleFood[] = allFoods
      .filter(
        (f) =>
          f.rating !== 'yuck' &&
          f.seasonEligibility.includes(season as Doc<'foods'>['seasonEligibility'][number]),
      )
      .map((f) => ({
        name: f.name,
        group: f.group,
        rating: f.rating,
        tier: f.tier,
      }))

    return { season, targetWindow, eligibleFoods }
  },
})

// ── 2. submitMealPlan ────────────────────────────────────────────────────────

/**
 * Persist a full plan. Validates that every food referenced in
 * mealPrepBatch.sourceFoods is season-eligible and non-yuck; rejects on the
 * first violation with a clear error. Replaces any existing plan whose covered
 * days overlap the same window. This is the write surface both the app and the
 * routine call.
 */
export const submitMealPlan = mutation({
  args: {
    season: v.string(),
    coveredDays: v.array(coveredDayValidator),
    mealPrepBatch: v.array(mealPrepComponentValidator),
    shoppingList: v.array(shoppingItemValidator),
    dailyMeals: v.array(dailyMealValidator),
    generatedBy: v.union(v.literal('rule'), v.literal('claude-routine')),
  },
  handler: async (ctx, plan) => {
    // Build the eligible set for this season (name → ok).
    const allFoods = await ctx.db.query('foods').collect()
    const eligibleNames = new Set(
      allFoods
        .filter(
          (f) =>
            f.rating !== 'yuck' &&
            f.seasonEligibility.includes(
              plan.season as Doc<'foods'>['seasonEligibility'][number],
            ),
        )
        .map((f) => f.name),
    )

    // Reject if any referenced source food is not eligible for this season.
    const violations: string[] = []
    for (const component of plan.mealPrepBatch) {
      for (const food of component.sourceFoods) {
        if (!eligibleNames.has(food)) violations.push(food)
      }
    }
    if (violations.length > 0) {
      const unique = Array.from(new Set(violations))
      throw new Error(
        `submitMealPlan rejected: these foods are not eligible for season "${plan.season}" ` +
          `(missing from eligible/non-yuck set): ${unique.join(', ')}. ` +
          `Every mealPrepBatch.sourceFoods entry must be a season-eligible, non-yuck food.`,
      )
    }

    const coveredDates = plan.coveredDays.map((d) => d.date)
    const coveredSet = new Set(coveredDates)

    // Replace any existing plan whose covered days overlap this window.
    const existing = await ctx.db.query('mealPlans').collect()
    for (const row of existing) {
      if (row.coveredDates.some((d) => coveredSet.has(d))) {
        await ctx.db.delete(row._id)
      }
    }

    const id = await ctx.db.insert('mealPlans', {
      season: plan.season,
      coveredDays: plan.coveredDays,
      coveredDates,
      mealPrepBatch: plan.mealPrepBatch,
      shoppingList: plan.shoppingList,
      dailyMeals: plan.dailyMeals,
      generatedBy: plan.generatedBy,
      createdAt: Date.now(),
    })
    return id
  },
})

// ── 3. listMealPlans / getPlanForDate ────────────────────────────────────────

/** All plans, newest first (for the Meal Plans page). */
export const listMealPlans = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('mealPlans')
      .withIndex('by_createdAt')
      .order('desc')
      .collect()
  },
})

/**
 * The active plan covering a given ISO date (defaults to today), or null. Scans
 * newest-first and returns the first plan whose coveredDates include the date.
 */
export const getPlanForDate = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, { date }) => {
    const target = date ?? new Date().toISOString().slice(0, 10)
    const plans = await ctx.db
      .query('mealPlans')
      .withIndex('by_createdAt')
      .order('desc')
      .collect()
    return plans.find((p) => p.coveredDates.includes(target)) ?? null
  },
})
