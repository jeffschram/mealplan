import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'
import { Page } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'

type MealPlan = Doc<'mealPlans'>

function PlanView({ plan }: { plan: MealPlan }) {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-normal">
          {plan.season}
        </Badge>
        <Badge variant="muted" className="font-normal">
          {plan.generatedBy === 'rule' ? 'Rule-based' : 'Claude routine'}
        </Badge>
        <span className="text-sm text-muted-foreground">
          Covers{' '}
          {plan.coveredDays
            .map((d) => d.label)
            .join(', ')}
        </span>
      </div>

      {/* Meal-prep batch */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Meal-prep batch</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {plan.mealPrepBatch.map((c) => (
            <div
              key={c.name}
              className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">
                  {c.quantityFor2People}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {c.sourceFoods.map((f) => (
                  <Badge key={f} variant="secondary" className="font-normal">
                    {f}
                  </Badge>
                ))}
              </div>
              <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
                {c.prepSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* Shopping list */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Shopping list</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <ul className="divide-y divide-border">
            {plan.shoppingList.map((s) => (
              <li
                key={s.item}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <span>{s.item}</span>
                <span className="text-muted-foreground tabular-nums">
                  {s.quantity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Daily meals */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Daily meals</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {plan.dailyMeals.map((day) => {
            const label = plan.coveredDays.find((d) => d.date === day.date)?.label
            return (
              <div
                key={day.date}
                className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{label ?? day.date}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {day.date}
                  </span>
                </div>
                <Meal title="Breakfast" items={day.breakfast} />
                <Meal title="Lunch" items={day.lunch} />
                <Meal title="Dinner" items={day.dinner} />
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Meal({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-primary/80">
        {title}
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground">—</div>
      ) : (
        <ul className="space-y-0.5 text-sm">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function MealPlansPage() {
  const plans = useQuery(api.mealPlans.listMealPlans)

  const latest = plans?.[0] ?? null

  return (
    <Page
      title="Meal Plans"
      description="Your current cadence-window plan (season-eligible, non-yuck foods, likes favored). Plans are authored automatically by the scheduled Claude routine."
    >
      <div className="space-y-6">
        {plans === undefined ? (
          <p className="text-sm text-muted-foreground">Loading plans…</p>
        ) : latest === null ? (
          <div className="max-w-md space-y-3 rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/12 text-2xl">
              🧑‍🍳
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              No plan yet. Meal plans are generated automatically twice a week
              (Mondays &amp; Fridays) by the Claude routine — your fresh plan will
              appear here as soon as it runs.
            </p>
          </div>
        ) : (
          <PlanView plan={latest} />
        )}
      </div>
    </Page>
  )
}
