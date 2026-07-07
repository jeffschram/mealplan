import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'
import { Page } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'

type MealPlan = Doc<'mealPlans'>
type DailyMeal = MealPlan['dailyMeals'][number]

/** Today's ISO date in the user's local timezone (YYYY-MM-DD). */
function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Re-derives "today" (local ISO date) on a timer so the look-ahead rolls over
 * to the new day at midnight without a manual reload — same approach the Today
 * board uses. Only sets state when the date string actually changes so the
 * Convex query (keyed on this value) keeps its live subscription.
 */
function useTodayIso(): string {
  const [iso, setIso] = useState(() => todayIso())
  useEffect(() => {
    const tick = () => {
      const next = todayIso()
      setIso((prev) => (prev === next ? prev : next))
    }
    const id = window.setInterval(tick, 30_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return iso
}

/** e.g. "Monday". */
function weekdayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long' })
}

/** e.g. "July 6". */
function monthDayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  })
}

const SEASON_EMOJI: Record<string, string> = {
  Spring: '🌱',
  Summer: '☀️',
  Autumn: '🍂',
  Winter: '❄️',
}

/** A compact meal line inside a day card. */
function MealLine({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs font-semibold uppercase tracking-wide text-primary/80">
        {title}
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground">—</div>
      ) : (
        <ul className="space-y-0.5 text-sm leading-snug">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** A single compact look-ahead card for one covered day. */
function DayCard({
  day,
  label,
  isToday,
}: {
  day: DailyMeal
  label: string
  isToday: boolean
}) {
  return (
    <div
      className={
        isToday
          ? 'space-y-3 rounded-3xl border-2 border-primary/40 bg-primary/[0.06] p-5 shadow-[var(--shadow-soft)]'
          : 'space-y-3 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]'
      }
    >
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="font-[var(--font-heading)] text-lg font-semibold tracking-tight">
            {label || weekdayLabel(day.date)}
          </div>
          <div className="text-xs text-muted-foreground">
            {monthDayLabel(day.date)}
          </div>
        </div>
        {isToday ? (
          <Badge variant="default" className="font-normal">
            Today
          </Badge>
        ) : null}
      </div>
      <MealLine title="Breakfast" items={day.breakfast} />
      <MealLine title="Lunch" items={day.lunch} />
      <MealLine title="Dinner" items={day.dinner} />
    </div>
  )
}

/** Compact "what's coming to prep & shop" summary for a plan. */
function PrepShopSummary({ plan }: { plan: MealPlan }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2 rounded-3xl border border-border bg-card/70 p-5 shadow-[var(--shadow-soft)]">
        <h3 className="text-sm font-semibold tracking-tight">
          🧑‍🍳 Meal prep ahead
        </h3>
        {plan.mealPrepBatch.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to prep.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {plan.mealPrepBatch.map((c) => (
              <li key={c.name}>
                <Badge variant="secondary" className="font-normal">
                  {c.name}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-2 rounded-3xl border border-border bg-card/70 p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight">🛒 To shop</h3>
          {plan.shoppingList.length > 0 &&
          (plan.shoppingChecked?.length ?? 0) > 0 ? (
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {plan.shoppingChecked?.length ?? 0} / {plan.shoppingList.length} got
            </span>
          ) : null}
        </div>
        {plan.shoppingList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to shop.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {plan.shoppingList.slice(0, 12).map((s) => (
              <li key={s.item}>
                <Badge variant="muted" className="font-normal">
                  {s.item}
                </Badge>
              </li>
            ))}
            {plan.shoppingList.length > 12 ? (
              <li className="self-center text-xs text-muted-foreground">
                +{plan.shoppingList.length - 12} more
              </li>
            ) : null}
          </ul>
        )}
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-2">
        See the{' '}
        <Link to="/meal-plans" className="text-primary underline-offset-2 hover:underline">
          Meal Plans
        </Link>{' '}
        page for the full prep steps and shopping quantities.
      </p>
    </div>
  )
}

/** A titled section of day cards for one plan window. */
function PlanSection({
  title,
  season,
  days,
  todayIsoDate,
  labelForDate,
}: {
  title: string
  season: string
  days: DailyMeal[]
  todayIsoDate: string
  labelForDate: (date: string) => string
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-[var(--font-heading)] text-xl font-semibold tracking-tight">
          {title}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-sm font-medium text-primary">
          <span aria-hidden>{SEASON_EMOJI[season] ?? '🍽️'}</span>
          {season}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {days.map((day) => (
          <DayCard
            key={day.date}
            day={day}
            label={labelForDate(day.date)}
            isToday={day.date === todayIsoDate}
          />
        ))}
      </div>
    </section>
  )
}

/** Sort a plan's daily meals chronologically by ISO date. */
function sortDays(days: DailyMeal[]): DailyMeal[] {
  return [...days].sort((a, b) => a.date.localeCompare(b.date))
}

export function UpcomingPage() {
  const iso = useTodayIso()
  // Reuse the existing queries — the plan covering today, plus all plans so we
  // can find one that starts after the current window ("Next").
  const current = useQuery(api.mealPlans.getPlanForDate, { date: iso })
  const allPlans = useQuery(api.mealPlans.listMealPlans)

  const loading = current === undefined || allPlans === undefined

  return (
    <Page
      title="Upcoming"
      description="A look ahead at the rest of this plan's window — and the next plan once it's ready — so you know what's cooking, what to prep, and what to shop."
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading upcoming days…</p>
      ) : (
        <UpcomingContent
          iso={iso}
          current={current}
          allPlans={allPlans ?? []}
        />
      )}
    </Page>
  )
}

function UpcomingContent({
  iso,
  current,
  allPlans,
}: {
  iso: string
  current: MealPlan | null
  allPlans: MealPlan[]
}) {
  // Remaining days of the current window: today onward, chronological.
  const currentDays = current
    ? sortDays(current.dailyMeals).filter((d) => d.date >= iso)
    : []

  // "Next" plan: the plan (other than the current one) whose earliest covered
  // date starts strictly after the current window's last covered date. If there
  // is no current plan, fall back to the soonest future plan.
  const currentLastDate = current
    ? current.coveredDates.slice().sort().at(-1) ?? iso
    : iso

  const nextPlan =
    allPlans
      .filter((p) => p._id !== current?._id)
      .map((p) => ({ plan: p, start: p.coveredDates.slice().sort()[0] ?? '' }))
      .filter((x) => x.start > (current ? currentLastDate : iso))
      .sort((a, b) => a.start.localeCompare(b.start))[0]?.plan ?? null

  const nextDays = nextPlan
    ? sortDays(nextPlan.dailyMeals).filter((d) => d.date >= iso)
    : []

  const labelFor = (plan: MealPlan) => (date: string) =>
    plan.coveredDays.find((d) => d.date === date)?.label ?? weekdayLabel(date)

  const hasCurrent = currentDays.length > 0
  const hasNext = nextDays.length > 0

  // Empty state — no plan covering today and nothing upcoming.
  if (!hasCurrent && !hasNext) {
    return (
      <div className="max-w-md space-y-3 rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/12 text-2xl">
          🗓️
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Nothing on the horizon yet. Fresh plans land automatically every Monday
          and Friday — your upcoming days will show up here as soon as the next
          one is generated. 🥕
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      {hasCurrent && current ? (
        <div className="space-y-6">
          <PlanSection
            title="This window"
            season={current.season}
            days={currentDays}
            todayIsoDate={iso}
            labelForDate={labelFor(current)}
          />
          <PrepShopSummary plan={current} />
        </div>
      ) : null}

      {hasNext && nextPlan ? (
        <div className="space-y-6">
          <PlanSection
            title="Next up"
            season={nextPlan.season}
            days={nextDays}
            todayIsoDate={iso}
            labelForDate={labelFor(nextPlan)}
          />
          <PrepShopSummary plan={nextPlan} />
        </div>
      ) : null}
    </div>
  )
}
