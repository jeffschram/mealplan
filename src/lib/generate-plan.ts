// Frontend re-export of the pure rule-based generator. Canonical implementation
// lives in convex/lib/generatePlan.ts so the app and the Claude routine share
// one source of truth. Importing here also keeps the generator unit tests and
// the browser bundle in lockstep.
export * from '../../convex/lib/generatePlan'
export type {
  MealPlan,
  MealPrepComponent,
  ShoppingListItem,
  DailyMeal,
  EligibleFood,
  Rating,
  GeneratedBy,
} from '../../convex/lib/plan'
