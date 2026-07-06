import { internalMutation } from './_generated/server'

// Idempotent seed for the WildFit meal-planning data model.
//
// Derived from `_output/wildfit-research.md` (§3 food tiers, §4 per-season
// eligibility matrix, §5 substitution rules) and corroborated against
// `_library/recipes.md` for Spring specifics.
//
// Confidence split (per the research's honesty note):
//  - Spring (Mild + Deep) and Summer eligibility: high confidence.
//  - Autumn/Fall and Winter eligibility: PROVISIONAL / inferred (paywalled).
//    Any food whose eligibility depends on the Autumn/Winter rows is flagged
//    `provisional: true` so the UI never presents it as verified.
//
// Season model: we use the four primary seasons only. The Mild Spring vs
// Deep Spring distinction is expressed through `tier: 'middle'` + `notes`
// rather than extra enum values. Because a 90-day WildFit planner keys off
// the strict ketosis phase, "Spring" in `seasonEligibility` means
// Deep-Spring-eligible (the core Spring food set). Middle/starchy foods that
// are allowed in Mild Spring but excluded in Deep Spring therefore omit
// 'Spring' from eligibility and carry a note explaining the Mild-Spring
// caveat.

type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter'
type Rating = 'like' | 'neutral' | 'yuck'

type FoodSeed = {
  name: string
  group: string
  seasonEligibility: Season[]
  tier?: string
  rating?: Rating
  provisional?: boolean
  notes?: string
}

// Common season sets for readability.
const ALL: Season[] = ['Spring', 'Summer', 'Autumn', 'Winter']
const SUMMER_ONWARD: Season[] = ['Summer', 'Autumn', 'Winter']

const FOODS: FoodSeed[] = [
  // ── Proteins — allowed in every season (Winter scarcer). High confidence. ──
  { name: 'Chicken', group: 'Proteins', seasonEligibility: ALL, rating: 'like', provisional: false },
  { name: 'Turkey', group: 'Proteins', seasonEligibility: ALL, provisional: false },
  { name: 'Beef (grass-fed)', group: 'Proteins', seasonEligibility: ALL, rating: 'like', provisional: false },
  { name: 'Pork', group: 'Proteins', seasonEligibility: ALL, provisional: false },
  { name: 'Lamb', group: 'Proteins', seasonEligibility: ALL, provisional: false },
  { name: 'Bacon (sugar-free)', group: 'Proteins', seasonEligibility: ALL, provisional: false, notes: 'Choose nitrate/sugar-free; used in many Spring recipes (Brussels sprouts & bacon).' },
  { name: 'Salmon', group: 'Proteins', seasonEligibility: ALL, rating: 'like', provisional: false },
  { name: 'Tuna', group: 'Proteins', seasonEligibility: ALL, provisional: false },
  { name: 'White fish', group: 'Proteins', seasonEligibility: ALL, provisional: false },
  { name: 'Shrimp', group: 'Proteins', seasonEligibility: ALL, provisional: false },
  { name: 'Eggs', group: 'Proteins', seasonEligibility: ALL, rating: 'like', provisional: false, notes: 'Central Spring protein; sheet-pan eggs, frittatas, egg wraps.' },
  { name: 'Bone broth', group: 'Proteins', seasonEligibility: ALL, provisional: false, notes: 'Great snack or soup base; Spring-legal.' },

  // ── Healthy Fats & oils — allowed all seasons, EMPHASIZED in Spring. ──
  { name: 'Coconut oil', group: 'Healthy Fats', seasonEligibility: ALL, rating: 'like', provisional: false, notes: 'Emphasized in Spring; base for fat bombs.' },
  { name: 'Olive oil', group: 'Healthy Fats', seasonEligibility: ALL, provisional: false },
  { name: 'Avocado oil', group: 'Healthy Fats', seasonEligibility: ALL, provisional: false },
  { name: 'Coconut milk', group: 'Healthy Fats', seasonEligibility: ALL, provisional: false, notes: 'Preferred plant milk in Spring; may kick some out of ketosis — observe reaction.' },
  { name: 'Lard / Tallow', group: 'Healthy Fats', seasonEligibility: ALL, provisional: false },
  { name: 'Ghee', group: 'Healthy Fats', seasonEligibility: ALL, provisional: false, notes: 'Clarified butter; generally tolerated though dairy-derived — observe reaction.' },

  // ── Leafy greens / non-starchy vegetables — core of Spring, all seasons. ──
  { name: 'Kale', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, rating: 'like', provisional: false },
  { name: 'Spinach', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, rating: 'like', provisional: false },
  { name: 'Arugula', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, provisional: false },
  { name: 'Swiss chard', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, provisional: false },
  { name: 'Collard greens', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, provisional: false },
  { name: 'Broccoli', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, rating: 'like', provisional: false },
  { name: 'Cauliflower', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, rating: 'like', provisional: false, notes: 'Workhorse substitute: rice, "toast", pizza crust, porridge, sauce thickener.' },
  { name: 'Zucchini', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, provisional: false, notes: 'Substitute for pasta/noodles.' },
  { name: 'Brussels sprouts', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, provisional: false },
  { name: 'Green beans', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, provisional: false },
  { name: 'Mushrooms', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, provisional: false },
  { name: 'Cabbage', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, provisional: false, notes: 'Slaw base; noodle substitute.' },
  { name: 'Asparagus', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, provisional: false },
  { name: 'Celery', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, provisional: false },
  { name: 'Cucumber', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, provisional: false, notes: 'Cucumber chips as a snack.' },
  { name: 'Bok choy', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, provisional: false },
  { name: 'Cilantro', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, provisional: false },
  { name: 'Onion', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, provisional: false },
  { name: 'Garlic', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, provisional: false },
  { name: 'Green bell pepper', group: 'Leafy/Non-starchy Vegetables', seasonEligibility: ALL, provisional: false, notes: 'Use green (not red) bell pepper for Mild/Deep Spring.' },

  // ── Middle Foods (starchy/root) — EXCLUDED in Deep Spring, so no 'Spring'.
  //    Autumn eligibility is inferred → provisional. ──
  { name: 'Carrots', group: 'Middle Foods (starchy/root)', seasonEligibility: SUMMER_ONWARD, tier: 'middle', provisional: true, notes: 'Middle Food. Limited/observe in Mild Spring; EXCLUDED in Deep Spring. Autumn/Winter eligibility inferred.' },
  { name: 'Red bell pepper', group: 'Middle Foods (starchy/root)', seasonEligibility: SUMMER_ONWARD, tier: 'middle', provisional: true, notes: 'Middle Food; excluded in Deep Spring (use green pepper instead). Autumn/Winter inferred.' },
  { name: 'Beets', group: 'Middle Foods (starchy/root)', seasonEligibility: SUMMER_ONWARD, tier: 'middle', provisional: true, notes: 'Middle/root Food; excluded in Deep Spring. Autumn/Winter inferred.' },
  { name: 'Sweet potato', group: 'Middle Foods (starchy/root)', seasonEligibility: ['Summer', 'Autumn'], tier: 'middle', provisional: true, notes: 'Complex carb reintroduced late Summer; abundant in Autumn. Excluded in Spring. Autumn status inferred.' },
  { name: 'Butternut squash', group: 'Middle Foods (starchy/root)', seasonEligibility: ['Autumn', 'Winter'], tier: 'middle', provisional: true, notes: 'Winter squash Middle Food; nighttime energy snack with coconut oil + warming spices. Excluded in Deep Spring. Autumn/Winter inferred.' },
  { name: 'Pumpkin', group: 'Middle Foods (starchy/root)', seasonEligibility: ['Autumn', 'Winter'], tier: 'middle', provisional: true, notes: 'Winter squash Middle Food. Autumn/Winter inferred.' },
  { name: 'Acorn squash', group: 'Middle Foods (starchy/root)', seasonEligibility: ['Autumn', 'Winter'], tier: 'middle', provisional: true, notes: 'Winter squash Middle Food. Autumn/Winter inferred.' },
  { name: 'Spaghetti squash', group: 'Middle Foods (starchy/root)', seasonEligibility: SUMMER_ONWARD, tier: 'middle', provisional: true, notes: 'Winter squash used as a noodle substitute; Middle Food. Autumn/Winter inferred.' },
  { name: 'Winter squash (assorted)', group: 'Middle Foods (starchy/root)', seasonEligibility: ['Autumn', 'Winter'], tier: 'middle', provisional: true, notes: 'Kabocha, delicata, hokkaido, hubbard, turban, etc. Middle Food. Autumn/Winter inferred.' },
  { name: 'Turnip', group: 'Middle Foods (starchy/root)', seasonEligibility: SUMMER_ONWARD, tier: 'middle', provisional: true, notes: 'Starchy root Middle Food; excluded in Deep Spring. Autumn/Winter inferred.' },
  { name: 'Parsnip', group: 'Middle Foods (starchy/root)', seasonEligibility: SUMMER_ONWARD, tier: 'middle', provisional: true, notes: 'Starchy root Middle Food; excluded in Deep Spring. Autumn/Winter inferred.' },
  { name: 'Legumes (beans/lentils/chickpeas)', group: 'Middle Foods (starchy/root)', seasonEligibility: SUMMER_ONWARD, tier: 'middle', provisional: true, notes: 'Middle Food; excluded in Spring (small soaked/sprouted qty for vegan Gatherer\'s Spring). Limited later seasons. Autumn/Winter inferred.' },

  // ── Culinary "fruits" — exemption from the fruit rule; allowed all seasons. ──
  { name: 'Avocado', group: 'Fruit', seasonEligibility: ALL, rating: 'like', provisional: false, notes: 'Culinary-fruit exemption; may be eaten with meals in Spring.' },
  { name: 'Tomato', group: 'Fruit', seasonEligibility: ALL, tier: 'middle', provisional: false, notes: 'Culinary-fruit exemption but sometimes treated as a Middle Food — observe reaction; omit for strict Deep Spring.' },
  { name: 'Olives', group: 'Fruit', seasonEligibility: ALL, provisional: false, notes: 'Culinary-fruit exemption; allowed in Spring.' },
  { name: 'Lemon', group: 'Fruit', seasonEligibility: ALL, provisional: false, notes: 'Culinary-fruit exemption; allowed in Spring.' },
  { name: 'Lime', group: 'Fruit', seasonEligibility: ALL, provisional: false, notes: 'Culinary-fruit exemption; allowed in Spring.' },

  // ── Fruit (general) — EXCLUDED in Deep Spring; reintroduced Summer (berries
  //    first, AM, empty stomach). No 'Spring'. Autumn abundant (inferred). ──
  { name: 'Blueberries', group: 'Fruit', seasonEligibility: ['Summer', 'Autumn'], provisional: true, notes: 'First fruit reintroduced in Summer (berries, AM on empty stomach). Excluded in Spring. Autumn inferred.' },
  { name: 'Raspberries', group: 'Fruit', seasonEligibility: ['Summer', 'Autumn'], provisional: true, notes: 'Berry — reintroduced first in Summer. Excluded in Spring. Autumn inferred.' },
  { name: 'Strawberries', group: 'Fruit', seasonEligibility: ['Summer', 'Autumn'], provisional: true, notes: 'Berry — Summer reintroduction. Excluded in Spring. Autumn inferred.' },
  { name: 'Blackberries', group: 'Fruit', seasonEligibility: ['Summer', 'Autumn'], provisional: true, notes: 'Berry — Summer reintroduction. Autumn inferred.' },
  { name: 'Apple', group: 'Fruit', seasonEligibility: ['Summer', 'Autumn'], provisional: true, notes: 'Eat AM, empty stomach when allowed. Excluded in Spring. Autumn abundance inferred.' },
  { name: 'Pear', group: 'Fruit', seasonEligibility: ['Summer', 'Autumn'], provisional: true, notes: 'Excluded in Spring. Autumn inferred.' },
  { name: 'Banana', group: 'Fruit', seasonEligibility: ['Summer', 'Autumn'], provisional: true, notes: 'Higher-sugar fruit; Summer/Autumn only. Autumn inferred.' },
  { name: 'Melon', group: 'Fruit', seasonEligibility: ['Summer', 'Autumn'], provisional: true, notes: 'Summer fruit. Autumn inferred.' },
  { name: 'Grapes', group: 'Fruit', seasonEligibility: ['Summer', 'Autumn'], provisional: true, notes: 'Higher-sugar; Autumn abundance inferred.' },
  { name: 'Peach', group: 'Fruit', seasonEligibility: ['Summer', 'Autumn'], provisional: true, notes: 'Summer stone fruit. Autumn inferred.' },

  // ── Nuts & Seeds — allowed all seasons (Spring-compatible fat/protein). ──
  { name: 'Almonds', group: 'Nuts & Seeds', seasonEligibility: ALL, provisional: false },
  { name: 'Walnuts', group: 'Nuts & Seeds', seasonEligibility: ALL, provisional: false },
  { name: 'Macadamia nuts', group: 'Nuts & Seeds', seasonEligibility: ALL, provisional: false },
  { name: 'Pecans', group: 'Nuts & Seeds', seasonEligibility: ALL, provisional: false },
  { name: 'Hazelnuts', group: 'Nuts & Seeds', seasonEligibility: ALL, provisional: false },
  { name: 'Brazil nuts', group: 'Nuts & Seeds', seasonEligibility: ALL, provisional: false },
  { name: 'Nut butter (unsweetened)', group: 'Nuts & Seeds', seasonEligibility: ALL, provisional: false, notes: 'No added sugar — just nut & oil. Base for fat bombs.' },
  { name: 'Pumpkin seeds', group: 'Nuts & Seeds', seasonEligibility: ALL, provisional: false },
  { name: 'Sunflower seeds', group: 'Nuts & Seeds', seasonEligibility: ALL, provisional: false },
  { name: 'Sesame seeds', group: 'Nuts & Seeds', seasonEligibility: ALL, provisional: false },
  { name: 'Flax seeds', group: 'Nuts & Seeds', seasonEligibility: ALL, provisional: false },
  { name: 'Chia seeds', group: 'Nuts & Seeds', seasonEligibility: ALL, provisional: false },
  { name: 'Hemp seeds', group: 'Nuts & Seeds', seasonEligibility: ALL, provisional: false },
  { name: 'Shredded coconut (unsweetened)', group: 'Nuts & Seeds', seasonEligibility: ALL, provisional: false, notes: 'Sugar-free; Spring porridge topping.' },

  // ── Alternative milks — allowed but limited in ketosis. ──
  { name: 'Almond milk (unsweetened)', group: 'Healthy Fats', seasonEligibility: ALL, provisional: false, notes: 'Limit in Spring/ketosis (carbs/additives); favor coconut milk. Use half amount in recipes.' },
  { name: 'Hemp milk (unsweetened)', group: 'Healthy Fats', seasonEligibility: ALL, provisional: false, notes: 'Acceptable plant milk. Rice/oat milk are OUT; soy is not ideal.' },

  // ── Dairy — removed ~Week 4, generally kept out. Provisional re-entry. ──
  { name: 'Cow milk', group: 'Dairy', seasonEligibility: [], provisional: true, notes: 'Removed ~Week 4 and generally kept out; replace with unsweetened plant milk. Any re-entry season is unverified.' },
  { name: 'Cheese', group: 'Dairy', seasonEligibility: [], provisional: true, notes: 'Dairy — excluded seasonally; re-entry unverified.' },
  { name: 'Yogurt', group: 'Dairy', seasonEligibility: [], provisional: true, notes: 'Dairy — excluded seasonally; re-entry unverified.' },
  { name: 'Butter', group: 'Dairy', seasonEligibility: [], provisional: true, notes: 'Dairy — excluded seasonally (ghee is generally tolerated). Re-entry unverified.' },

  // ── Grains / Pseudograins ──
  { name: 'Quinoa', group: 'Grains/Pseudograins', seasonEligibility: SUMMER_ONWARD, provisional: true, notes: 'Pseudograin — limited (1–2 Tbsp if already eating); excluded in Deep Spring. Autumn/Winter inferred.' },
  { name: 'Buckwheat', group: 'Grains/Pseudograins', seasonEligibility: SUMMER_ONWARD, provisional: true, notes: 'Pseudograin — limited; excluded in Deep Spring. Autumn/Winter inferred.' },
  { name: 'Amaranth', group: 'Grains/Pseudograins', seasonEligibility: SUMMER_ONWARD, provisional: true, notes: 'Pseudograin — limited; excluded in Deep Spring. Autumn/Winter inferred.' },
  { name: 'Brown rice', group: 'Grains/Pseudograins', seasonEligibility: ['Summer', 'Autumn'], provisional: true, notes: 'Complex carb reintroduced late Summer; allowed Autumn. Excluded in Spring/Winter. Autumn status inferred.' },
  { name: 'Wheat / bread', group: 'Avoid', seasonEligibility: [], provisional: false, notes: 'True cereal grain removed ~Week 4. Substitute nut-and-seed bread / cauliflower.' },
  { name: 'Oats', group: 'Avoid', seasonEligibility: [], provisional: false, notes: 'Cereal grain removed ~Week 4.' },
  { name: 'White potato', group: 'Avoid', seasonEligibility: [], provisional: false, notes: 'Removed ~Week 4 with grains. Not the same as sweet potato (a Middle Food).' },

  // ── Sweeteners ──
  { name: 'Honey', group: 'Avoid', seasonEligibility: SUMMER_ONWARD, provisional: true, notes: 'Natural sweetener — sugar substitute in general WildFit but EXCLUDED in Spring/ketosis (no sweetness). Autumn/Winter inferred.' },
  { name: 'Dates', group: 'Avoid', seasonEligibility: SUMMER_ONWARD, provisional: true, notes: 'Natural sweetener — excluded in Spring/ketosis. Autumn/Winter inferred.' },

  // ── Explicit Avoid list — excluded in every season. High confidence. ──
  { name: 'Refined / added sugar', group: 'Avoid', seasonEligibility: [], provisional: false, notes: 'Removed early and kept out in every season.' },
  { name: 'Processed food', group: 'Avoid', seasonEligibility: [], provisional: false, notes: 'Excluded in every season.' },
  { name: 'Food additives', group: 'Avoid', seasonEligibility: [], provisional: false, notes: 'Removed ~Week 5; excluded in every season.' },
  { name: 'Alcohol', group: 'Avoid', seasonEligibility: [], provisional: false, notes: 'Removed ~Week 5; excluded in every season (re-entry unverified).' },
  { name: 'Caffeine', group: 'Avoid', seasonEligibility: [], provisional: false, notes: 'Removed ~Week 5; excluded (re-entry unverified).' },
  { name: 'Soy milk', group: 'Avoid', seasonEligibility: [], provisional: false, notes: '"Not ideal"; rice milk and oat milk are OUT.' },
]

// Monday-align a timestamp to the start of its ISO week (local midnight).
function mondayStart(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = date.getDay() // 0 = Sun … 6 = Sat
  const diff = (day === 0 ? -6 : 1) - day // shift back to Monday
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

// ISO-8601 week number for a Monday-aligned date.
function isoWeekNumber(monday: Date): number {
  const d = new Date(
    Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()),
  )
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Idempotent: skip entirely if foods already exist.
    const existingFood = await ctx.db.query('foods').first()
    const existingWeek = await ctx.db.query('seasonsCalendar').first()
    if (existingFood || existingWeek) {
      return {
        skipped: true,
        reason: 'Data already present; seed is idempotent.',
      }
    }

    // Insert foods.
    let provisionalCount = 0
    for (const f of FOODS) {
      const provisional = f.provisional ?? false
      if (provisional) provisionalCount++
      await ctx.db.insert('foods', {
        name: f.name,
        group: f.group,
        seasonEligibility: f.seasonEligibility,
        tier: f.tier,
        rating: f.rating ?? 'neutral',
        provisional,
        notes: f.notes,
      })
    }

    // Generate the next 52 weeks starting this week (Monday-aligned),
    // each defaulting to 'Spring' (the household is currently in Spring).
    const firstMonday = mondayStart(new Date())
    for (let i = 0; i < 52; i++) {
      const monday = new Date(firstMonday)
      monday.setDate(firstMonday.getDate() + i * 7)
      await ctx.db.insert('seasonsCalendar', {
        weekStartDate: monday.getTime(),
        year: monday.getFullYear(),
        weekNumber: isoWeekNumber(monday),
        season: 'Spring',
      })
    }

    return {
      skipped: false,
      foods: FOODS.length,
      provisionalFoods: provisionalCount,
      weeks: 52,
    }
  },
})
