import { describe, expect, it } from 'vitest'
import { bucketForGroup, bucketFoods, generatePlan } from './generate-plan'
import type { EligibleFood } from './generate-plan'
import type { GenerationContext } from '../../convex/lib/generatePlan'

const FOODS: EligibleFood[] = [
  { name: 'Chicken', group: 'Proteins', rating: 'like' },
  { name: 'Turkey', group: 'Proteins', rating: 'neutral' },
  { name: 'Salmon', group: 'Proteins', rating: 'like' },
  { name: 'Kale', group: 'Leafy/Non-starchy Vegetables', rating: 'like' },
  { name: 'Spinach', group: 'Leafy/Non-starchy Vegetables', rating: 'like' },
  { name: 'Broccoli', group: 'Leafy/Non-starchy Vegetables', rating: 'neutral' },
  { name: 'Zucchini', group: 'Leafy/Non-starchy Vegetables', rating: 'neutral' },
  { name: 'Olive oil', group: 'Healthy Fats', rating: 'neutral' },
  { name: 'Coconut oil', group: 'Healthy Fats', rating: 'like' },
  { name: 'Almonds', group: 'Nuts & Seeds', rating: 'neutral' },
]

function ctx(): GenerationContext {
  return {
    season: 'Spring',
    targetWindow: {
      coveredDays: [
        { date: '2026-07-13', label: 'Monday' },
        { date: '2026-07-14', label: 'Tuesday' },
        { date: '2026-07-15', label: 'Wednesday' },
      ],
    },
    eligibleFoods: FOODS,
  }
}

describe('bucketForGroup', () => {
  it('maps groups onto protein/vegetable/fat/other', () => {
    expect(bucketForGroup('Proteins')).toBe('protein')
    expect(bucketForGroup('Healthy Fats')).toBe('fat')
    expect(bucketForGroup('Leafy/Non-starchy Vegetables')).toBe('vegetable')
    expect(bucketForGroup('Middle Foods (starchy/root)')).toBe('vegetable')
    expect(bucketForGroup('Nuts & Seeds')).toBe('other')
  })
})

describe('bucketFoods', () => {
  it('sorts likes before neutrals within each bucket', () => {
    const b = bucketFoods(FOODS)
    // Proteins: likes (Chicken, Salmon) come before neutral (Turkey).
    expect(b.protein.map((f) => f.name)).toEqual(['Chicken', 'Salmon', 'Turkey'])
    // Fats: Coconut oil (like) before Olive oil (neutral).
    expect(b.fat.map((f) => f.name)).toEqual(['Coconut oil', 'Olive oil'])
  })
})

describe('generatePlan', () => {
  it('produces a valid plan covering every day with B/L/D', () => {
    const plan = generatePlan(ctx())
    expect(plan.season).toBe('Spring')
    expect(plan.generatedBy).toBe('rule')
    expect(plan.dailyMeals).toHaveLength(3)
    for (const day of plan.dailyMeals) {
      expect(day.breakfast.length).toBeGreaterThan(0)
      expect(day.lunch.length).toBeGreaterThan(0)
      expect(day.dinner.length).toBeGreaterThan(0)
    }
  })

  it('only references eligible foods and favors likes', () => {
    const plan = generatePlan(ctx())
    const eligibleNames = new Set(FOODS.map((f) => f.name))
    for (const c of plan.mealPrepBatch) {
      for (const food of c.sourceFoods) {
        expect(eligibleNames.has(food)).toBe(true)
      }
    }
    // The first protein component should be a 'like' (Chicken).
    const proteinComp = plan.mealPrepBatch.find((c) => c.name.includes('Chicken'))
    expect(proteinComp).toBeDefined()
  })

  it('rotates proteins across days for variety', () => {
    const plan = generatePlan(ctx())
    const dinners = plan.dailyMeals.map((d) => d.dinner[0])
    // 3 covered days, 3 proteins → all three distinct.
    expect(new Set(dinners).size).toBe(3)
  })

  it('aggregates a de-duplicated shopping list', () => {
    const plan = generatePlan(ctx())
    const items = plan.shoppingList.map((s) => s.item)
    expect(new Set(items).size).toBe(items.length)
    expect(items).toContain('Chicken')
  })

  it('is deterministic', () => {
    expect(generatePlan(ctx())).toEqual(generatePlan(ctx()))
  })

  it('degrades gracefully with few foods', () => {
    const sparse: GenerationContext = {
      season: 'Winter',
      targetWindow: {
        coveredDays: [{ date: '2026-01-05', label: 'Monday' }],
      },
      eligibleFoods: [{ name: 'Beef', group: 'Proteins', rating: 'neutral' }],
    }
    const plan = generatePlan(sparse)
    expect(plan.dailyMeals).toHaveLength(1)
    expect(plan.mealPrepBatch.length).toBeGreaterThan(0)
  })
})
