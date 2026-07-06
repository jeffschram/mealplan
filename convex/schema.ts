import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// Placeholder schema for the Mealplan app.
// Tables (foods, seasons, mealPlans, etc.) will be modeled here as the app grows.
export default defineSchema({
  // Minimal placeholder table so the deployment has a valid schema.
  // Safe to remove/replace once real tables are defined.
  placeholder: defineTable({
    note: v.optional(v.string()),
  }),
})
