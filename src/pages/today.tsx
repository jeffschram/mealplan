import { Link } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'
import { Page } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type MealPlan = Doc<'mealPlans'>
type MealPrepComponent = MealPlan['mealPrepBatch'][number]

/** Today's ISO date in the user's local timezone (YYYY-MM-DD). */
function todayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** A friendly, long-form label for a local ISO date, e.g. "Monday, July 6". */
function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

/** One meal (Breakfast/Lunch/Dinner): its component references, each resolved
 *  against the prep batch so you can see exactly what to grab and plate. */
function MealCard({
  title,
  items,
  prepByName,
}: {
  title: string
  items: string[]
  prepByName: Map<string, MealPrepComponent>
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing planned.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => {
            const component = prepByName.get(item)
            return (
              <li key={i} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{item}</span>
                  {component ? (
                    <span className="text-xs text-muted-foreground">
                      {component.quantityFor2People}
                    </span>
                  ) : null}
                </div>
                {component && component.sourceFoods.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {component.sourceFoods.map((f) => (
                      <Badge key={f} variant="secondary" className="font-normal">
                        {f}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function TodayPage() {
  const iso = todayIso()
  const plan = useQuery(api.mealPlans.getPlanForDate, { date: iso })

  const longDate = formatLongDate(iso)

  // Loading.
  if (plan === undefined) {
    return (
      <Page title="Today" description={longDate}>
        <p className="text-sm text-muted-foreground">Loading today’s plan…</p>
      </Page>
    )
  }

  const today = plan?.dailyMeals.find((d) => d.date === iso)

  // No plan covers today (or a covered plan somehow lacks today's meals).
  if (!plan || !today) {
    return (
      <Page title="Today" description={longDate}>
        <div className="max-w-md space-y-4 rounded-lg border border-border p-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">
              No plan covers today
            </h2>
            <p className="text-sm text-muted-foreground">
              There’s no active meal plan for {longDate}. Head to Meal Plans to
              generate one for the upcoming cadence window.
            </p>
          </div>
          <Button asChild>
            <Link to="/meal-plans">Generate a plan</Link>
          </Button>
        </div>
      </Page>
    )
  }

  // Resolve each meal's component references against the prep batch.
  const prepByName = new Map<string, MealPrepComponent>(
    plan.mealPrepBatch.map((c) => [c.name, c]),
  )

  return (
    <Page
      title="Today"
      description="Breakfast, lunch, and dinner from the active plan — same for both of you."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{longDate}</span>
          <Badge variant="secondary" className="font-normal">
            {plan.season}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MealCard
            title="Breakfast"
            items={today.breakfast}
            prepByName={prepByName}
          />
          <MealCard title="Lunch" items={today.lunch} prepByName={prepByName} />
          <MealCard
            title="Dinner"
            items={today.dinner}
            prepByName={prepByName}
          />
        </div>
      </div>
    </Page>
  )
}
