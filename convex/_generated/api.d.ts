/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as foods from "../foods.js";
import type * as lib_cadence from "../lib/cadence.js";
import type * as lib_generatePlan from "../lib/generatePlan.js";
import type * as lib_plan from "../lib/plan.js";
import type * as mealPlans from "../mealPlans.js";
import type * as seasons from "../seasons.js";
import type * as seed from "../seed.js";
import type * as stats from "../stats.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  foods: typeof foods;
  "lib/cadence": typeof lib_cadence;
  "lib/generatePlan": typeof lib_generatePlan;
  "lib/plan": typeof lib_plan;
  mealPlans: typeof mealPlans;
  seasons: typeof seasons;
  seed: typeof seed;
  stats: typeof stats;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
