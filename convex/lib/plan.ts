// Shared plan data types for the meal-plan engine. Pure types — no Convex
// imports — so both the generator (convex/lib/generatePlan.ts) and the browser
// bundle can share them.

import type { CoveredDay } from './cadence'

export type Rating = 'like' | 'neutral' | 'yuck'

/** A season-eligible food as returned by getGenerationContext. */
export type EligibleFood = {
  name: string
  group: string
  rating: Rating
  tier?: string
}

/** A make-ahead component prepped in batch for the covered window. */
export type MealPrepComponent = {
  name: string
  sourceFoods: string[]
  quantityFor2People: string
  prepSteps: string[]
}

export type ShoppingListItem = {
  item: string
  quantity: string
}

/** Per-day meals; each meal references meal-prep component names. */
export type DailyMeal = {
  date: string
  breakfast: string[]
  lunch: string[]
  dinner: string[]
}

export type GeneratedBy = 'rule' | 'claude-routine'

/** A full meal plan, matching the mealPlans table shape. */
export type MealPlan = {
  season: string
  coveredDays: CoveredDay[]
  mealPrepBatch: MealPrepComponent[]
  shoppingList: ShoppingListItem[]
  dailyMeals: DailyMeal[]
  generatedBy: GeneratedBy
}
