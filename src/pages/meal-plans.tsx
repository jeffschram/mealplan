import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'
import { Page } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

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
      <ShoppingList plan={plan} />

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

type ShoppingItem = MealPlan['shoppingList'][number]

/**
 * Amazon Fresh grocery search deep link for a single item. `i=amazonfresh`
 * scopes the search to Amazon's grocery storefront (which also surfaces Whole
 * Foods items, since Whole Foods is served through amazon.com). This opens a
 * real *search results* page — Amazon can't be auto-filled without a partner
 * API, so the shopper adds items to the cart themselves.
 */
function amazonFreshSearchUrl(item: string) {
  return `https://www.amazon.com/s?k=${encodeURIComponent(item)}&i=amazonfresh`
}

/** Render items as clean "Item — quantity" lines for the clipboard / mailto. */
function itemsToText(items: ShoppingItem[]) {
  return items
    .map((s) => (s.quantity ? `${s.item} — ${s.quantity}` : s.item))
    .join('\n')
}

/**
 * Shopping list with per-item check-off, persisted per plan via Convex so the
 * checked state survives reloads and live-syncs across the kitchen iPad and a
 * phone at the store. Checked items sink to the bottom and get a muted,
 * struck-through style. Rows are touch-sized for tapping while shopping.
 *
 * An export toolbar lets you copy the list to the clipboard (universal — paste
 * into any store app, notes, etc.) or jump to an Amazon Fresh search for each
 * item. Export defaults to the remaining (unchecked) items with a toggle for
 * the full list.
 */
function ShoppingList({ plan }: { plan: MealPlan }) {
  const toggle = useMutation(api.mealPlans.toggleShoppingItem)
  const clear = useMutation(api.mealPlans.clearShoppingChecks)

  const [includeAll, setIncludeAll] = useState(false)
  const [copied, setCopied] = useState(false)

  const checkedSet = useMemo(
    () => new Set(plan.shoppingChecked ?? []),
    [plan.shoppingChecked],
  )

  // Stable-sort checked items below unchecked ones, preserving original order
  // within each group.
  const rows = useMemo(() => {
    return plan.shoppingList
      .map((s, i) => ({ ...s, i, checked: checkedSet.has(s.item) }))
      .sort((a, b) =>
        a.checked === b.checked ? a.i - b.i : a.checked ? 1 : -1,
      )
  }, [plan.shoppingList, checkedSet])

  const total = plan.shoppingList.length
  const gotCount = plan.shoppingList.filter((s) => checkedSet.has(s.item)).length
  const allDone = total > 0 && gotCount === total

  // Items to export: remaining (unchecked) by default, or the full list.
  const exportItems = useMemo(
    () =>
      includeAll
        ? plan.shoppingList
        : plan.shoppingList.filter((s) => !checkedSet.has(s.item)),
    [plan.shoppingList, checkedSet, includeAll],
  )

  const handleCopy = async () => {
    const text = itemsToText(exportItems)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for browsers/contexts without the async clipboard API.
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const handleShopAmazon = () => {
    const first = exportItems[0]
    if (first) window.open(amazonFreshSearchUrl(first.item), '_blank', 'noopener')
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Shopping list</h2>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium tabular-nums',
              allDone ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {allDone ? '🎉 ' : ''}
            {gotCount} / {total} got
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clear({ planId: plan._id })}
            disabled={gotCount === 0}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Export toolbar */}
      {total > 0 && (
        <div className="space-y-2 rounded-2xl border border-border bg-card/60 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              disabled={exportItems.length === 0}
            >
              {copied ? '✓ Copied!' : `Copy list (${exportItems.length})`}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleShopAmazon}
              disabled={exportItems.length === 0}
            >
              🛒 Shop on Amazon Fresh
            </Button>
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={includeAll}
                onCheckedChange={(v) => setIncludeAll(v === true)}
                className="size-4"
              />
              Include got items
            </label>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Copy pastes into any store or notes app. Amazon Fresh links open a{' '}
            <span className="font-medium">search</span> for each item — add them to
            your cart there. One-click cart-fill isn&apos;t possible without an
            Amazon partner API.
          </p>
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <ul className="divide-y divide-border">
          {rows.map((s) => (
            <li key={s.item}>
              <label
                className={cn(
                  'flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-muted/40',
                  s.checked && 'text-muted-foreground',
                )}
              >
                <Checkbox
                  checked={s.checked}
                  onCheckedChange={() =>
                    toggle({ planId: plan._id, item: s.item })
                  }
                  className="size-5"
                />
                <span
                  className={cn('flex-1', s.checked && 'line-through')}
                >
                  {s.item}
                </span>
                <span
                  className={cn(
                    'tabular-nums text-muted-foreground',
                    s.checked && 'line-through',
                  )}
                >
                  {s.quantity}
                </span>
                <a
                  href={amazonFreshSearchUrl(s.item)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title={`Search Amazon Fresh for ${s.item}`}
                  aria-label={`Search Amazon Fresh for ${s.item}`}
                  className="shrink-0 rounded-md px-1.5 py-1 text-base leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  🛒
                </a>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </section>
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
