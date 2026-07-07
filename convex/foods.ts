import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { seasonValidator } from './schema'

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

// Normalize + validate the free-text fields shared by create/update. Names and
// groups are trimmed; empty values are rejected. Season eligibility is already
// constrained to valid seasons by the validator, but we de-dupe it here.
function cleanName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    throw new Error('Food name is required.')
  }
  return trimmed
}

function cleanGroup(group: string): string {
  const trimmed = group.trim()
  if (trimmed.length === 0) {
    throw new Error('Food group is required.')
  }
  return trimmed
}

function dedupeSeasons(seasons: Array<'Spring' | 'Summer' | 'Autumn' | 'Winter'>) {
  return [...new Set(seasons)]
}

// Create a new food. Household-entered foods are treated as verified, so
// provisional is false and the rating starts neutral.
export const create = mutation({
  args: {
    name: v.string(),
    group: v.string(),
    seasonEligibility: v.array(seasonValidator),
    tier: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { name, group, seasonEligibility, tier, notes }) => {
    const trimmedTier = tier?.trim()
    const trimmedNotes = notes?.trim()
    return await ctx.db.insert('foods', {
      name: cleanName(name),
      group: cleanGroup(group),
      seasonEligibility: dedupeSeasons(seasonEligibility),
      tier: trimmedTier ? trimmedTier : undefined,
      rating: 'neutral',
      provisional: false,
      notes: trimmedNotes ? trimmedNotes : undefined,
    })
  },
})

// Patch the provided fields of an existing food. Because the household is
// actively correcting the data here (season eligibility especially), any edit
// marks the food as verified — provisional flips to false.
export const update = mutation({
  args: {
    foodId: v.id('foods'),
    name: v.optional(v.string()),
    group: v.optional(v.string()),
    seasonEligibility: v.optional(v.array(seasonValidator)),
    tier: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { foodId, name, group, seasonEligibility, tier, notes }) => {
    const existing = await ctx.db.get(foodId)
    if (!existing) {
      throw new Error('Food not found.')
    }

    const patch: {
      name?: string
      group?: string
      seasonEligibility?: Array<'Spring' | 'Summer' | 'Autumn' | 'Winter'>
      tier?: string | undefined
      notes?: string | undefined
      provisional: boolean
    } = { provisional: false }

    if (name !== undefined) patch.name = cleanName(name)
    if (group !== undefined) patch.group = cleanGroup(group)
    if (seasonEligibility !== undefined) {
      patch.seasonEligibility = dedupeSeasons(seasonEligibility)
    }
    if (tier !== undefined) {
      const trimmed = tier.trim()
      patch.tier = trimmed ? trimmed : undefined
    }
    if (notes !== undefined) {
      const trimmed = notes.trim()
      patch.notes = trimmed ? trimmed : undefined
    }

    await ctx.db.patch(foodId, patch)
  },
})

// Delete a food outright. The UI gates this behind a confirm step.
export const remove = mutation({
  args: { foodId: v.id('foods') },
  handler: async (ctx, { foodId }) => {
    await ctx.db.delete(foodId)
  },
})
