import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'

type MealPlan = Doc<'mealPlans'>
type MealPrepComponent = MealPlan['mealPrepBatch'][number]

/** Today's ISO date in the user's local timezone (YYYY-MM-DD). */
function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Re-derives "today" (local ISO date) on a timer so an always-on display rolls
 * over to the new day when the wall clock passes midnight — no manual reload.
 * Only sets state when the date string actually changes, so the Convex query
 * (keyed on this value) keeps its live subscription and re-runs only on a real
 * day boundary. Returns the current ISO date plus the moment it last checked.
 */
function useToday(): { iso: string; checkedAt: Date } {
  const [iso, setIso] = useState(() => todayIso())
  const [checkedAt, setCheckedAt] = useState(() => new Date())

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setCheckedAt(now)
      const next = todayIso(now)
      setIso((prev) => (prev === next ? prev : next))
    }
    // Check every 30s: cheap, and guarantees a same-minute rollover past midnight.
    const id = window.setInterval(tick, 30_000)
    // Also re-check when the tab regains focus (e.g. iPad wakes from sleep).
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return { iso, checkedAt }
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

/** e.g. "3:42 PM" — used for the subtle "as of" line. */
function timeLabel(dt: Date): string {
  return dt.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

const SEASON_EMOJI: Record<string, string> = {
  Spring: '🌱',
  Summer: '☀️',
  Autumn: '🍂',
  Winter: '❄️',
}

const MEAL_EMOJI: Record<string, string> = {
  Breakfast: '🍳',
  Lunch: '🥗',
  Dinner: '🍽️',
}

/** First prep step, trimmed to a short glanceable cue. */
function prepCue(component: MealPrepComponent | undefined): string | null {
  if (!component || component.prepSteps.length === 0) return null
  const first = component.prepSteps[0].trim()
  if (!first) return null
  return first.length > 90 ? `${first.slice(0, 89).trimEnd()}…` : first
}

/** One glanceable meal column (Breakfast / Lunch / Dinner). */
function MealColumn({
  title,
  items,
  prepByName,
}: {
  title: string
  items: string[]
  prepByName: Map<string, MealPrepComponent>
}) {
  return (
    <div className="flex flex-col rounded-4xl border border-border bg-card p-7 shadow-[var(--shadow-soft-lg)] lg:p-8">
      <div className="mb-5 flex items-center gap-3">
        <span aria-hidden className="text-3xl leading-none lg:text-4xl">
          {MEAL_EMOJI[title]}
        </span>
        <h2 className="font-[var(--font-heading)] text-2xl font-semibold tracking-tight text-primary lg:text-3xl">
          {title}
        </h2>
      </div>

      {items.length === 0 ? (
        <p className="text-lg text-muted-foreground">Nothing planned.</p>
      ) : (
        <ul className="flex flex-1 flex-col gap-6">
          {items.map((item, i) => {
            const component = prepByName.get(item)
            const cue = prepCue(component)
            return (
              <li key={i} className="flex flex-col gap-2">
                <span className="text-2xl font-bold leading-tight tracking-tight lg:text-[1.7rem]">
                  {item}
                </span>
                {component ? (
                  <span className="inline-flex w-fit max-w-full items-center rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground lg:text-base">
                    {component.quantityFor2People}
                  </span>
                ) : null}
                {cue ? (
                  <p className="text-base leading-snug text-muted-foreground lg:text-lg">
                    {cue}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Big friendly header: weekday + date on the left, season badge on the right. */
function BoardHeader({
  iso,
  season,
  asOf,
}: {
  iso: string
  season?: string
  asOf: Date
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div>
        <p className="text-lg font-semibold uppercase tracking-[0.18em] text-primary/80 lg:text-xl">
          {weekdayLabel(iso)}
        </p>
        <h1 className="font-[var(--font-heading)] text-5xl font-semibold tracking-tight text-foreground lg:text-6xl xl:text-7xl">
          {monthDayLabel(iso)}
        </h1>
      </div>

      <div className="flex flex-col items-end gap-2">
        {season ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-5 py-2 text-xl font-semibold text-primary lg:text-2xl">
            <span aria-hidden>{SEASON_EMOJI[season] ?? '🍽️'}</span>
            {season}
          </span>
        ) : null}
        <span className="text-sm text-muted-foreground/80">
          Updated {timeLabel(asOf)}
        </span>
      </div>
    </header>
  )
}

/** Full-bleed wrapper so the board fills the iPad screen edge-to-edge, breaking
 *  out of the app shell's narrow (max-w-5xl) content column. */
function Board({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-6 -my-10 min-h-[calc(100svh-4.5rem)] bg-background px-6 py-8 lg:px-10 lg:py-12">
      <div className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col gap-10">
        {children}
      </div>
    </div>
  )
}

export function TodayPage() {
  const { iso, checkedAt } = useToday()
  // useQuery re-keys on `iso`, so it moves to the new day automatically at
  // midnight AND live-updates whenever the routine writes a fresh plan.
  const plan = useQuery(api.mealPlans.getPlanForDate, { date: iso })

  // Loading — keep the header visible so the display never looks broken.
  if (plan === undefined) {
    return (
      <Board>
        <BoardHeader iso={iso} asOf={checkedAt} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xl text-muted-foreground">Loading today’s plan…</p>
        </div>
      </Board>
    )
  }

  const today = plan?.dailyMeals.find((d) => d.date === iso)

  // Empty state — warm, large, kitchen-friendly.
  if (!plan || !today) {
    return (
      <Board>
        <BoardHeader iso={iso} season={plan?.season} asOf={checkedAt} />
        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-2xl space-y-6 rounded-4xl border border-border bg-card p-12 text-center shadow-[var(--shadow-soft-lg)]">
            <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-primary/12 text-6xl">
              🍲
            </div>
            <div className="space-y-3">
              <h2 className="font-[var(--font-heading)] text-4xl font-semibold tracking-tight">
                No plan for today yet
              </h2>
              <p className="text-xl leading-relaxed text-muted-foreground">
                The next fresh plan arrives with the week — new plans land every
                Monday and Friday. Until then, cook something you love. 🥕
              </p>
            </div>
          </div>
        </div>
      </Board>
    )
  }

  // Resolve each meal's component references against the prep batch.
  const prepByName = new Map<string, MealPrepComponent>(
    plan.mealPrepBatch.map((c) => [c.name, c]),
  )

  return (
    <Board>
      <BoardHeader iso={iso} season={plan.season} asOf={checkedAt} />

      <div className="grid flex-1 items-stretch gap-6 lg:grid-cols-3 lg:gap-8">
        <MealColumn
          title="Breakfast"
          items={today.breakfast}
          prepByName={prepByName}
        />
        <MealColumn title="Lunch" items={today.lunch} prepByName={prepByName} />
        <MealColumn
          title="Dinner"
          items={today.dinner}
          prepByName={prepByName}
        />
      </div>
    </Board>
  )
}
