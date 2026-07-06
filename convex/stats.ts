import { query } from './_generated/server'

// Lightweight verification / dashboard query: counts of seeded data.
export const summary = query({
  args: {},
  handler: async (ctx) => {
    const foods = await ctx.db.query('foods').collect()
    const weeks = await ctx.db.query('seasonsCalendar').collect()

    const groups: Record<string, number> = {}
    let provisional = 0
    for (const f of foods) {
      groups[f.group] = (groups[f.group] ?? 0) + 1
      if (f.provisional) provisional++
    }

    return {
      foodCount: foods.length,
      provisionalFoodCount: provisional,
      groups,
      weekCount: weeks.length,
    }
  },
})
