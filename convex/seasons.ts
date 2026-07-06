import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { seasonValidator } from './schema'

// List all 52 weeks of the seasons calendar, ordered by their Monday start
// date. The by_weekStart index gives us a stable chronological order without
// an extra client-side sort.
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('seasonsCalendar')
      .withIndex('by_weekStart')
      .collect()
  },
})

// Assign a season to a single week. Autosaves from the UI (the Select fires
// this on change) — there is no separate save step.
export const setSeason = mutation({
  args: {
    weekId: v.id('seasonsCalendar'),
    season: seasonValidator,
  },
  handler: async (ctx, { weekId, season }) => {
    await ctx.db.patch(weekId, { season })
  },
})
