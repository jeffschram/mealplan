import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// List every food. The UI groups these client-side by `group` and sinks
// yuck-rated foods into a separate de-emphasized section, so we just return
// the full set sorted by group then name for a stable render order.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const foods = await ctx.db.query('foods').collect()
    foods.sort(
      (a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name),
    )
    return foods
  },
})

// Set the single shared household rating for a food. Autosaves from the UI —
// there is no separate save step.
export const setRating = mutation({
  args: {
    foodId: v.id('foods'),
    rating: v.union(
      v.literal('like'),
      v.literal('neutral'),
      v.literal('yuck'),
    ),
  },
  handler: async (ctx, { foodId, rating }) => {
    await ctx.db.patch(foodId, { rating })
  },
})
