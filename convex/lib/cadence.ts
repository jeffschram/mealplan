// Pure cadence logic for the meal-plan engine.
//
// This module has NO Convex imports so it can be bundled by Convex functions
// AND re-exported to the browser bundle (see src/lib/cadence.ts). Keep it pure.
//
// The cadence is driven by the REAL day-of-week of a reference date — it does
// NOT rely on any week alignment in the seasonsCalendar seed:
//
//   • Friday  → plan covers Mon/Tue/Wed of the FOLLOWING week; prep Saturday.
//   • Monday  → plan covers Thu/Fri/Sat/Sun of THAT week;      prep Wednesday.
//
// Any other reference day snaps to the nearest of these two anchors (see
// resolveAnchor). Callers may also pass an explicit override (an anchor day or
// an explicit list of covered dates) to bypass the day-of-week logic entirely.

export type DayName =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'

export const DAY_NAMES: DayName[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export type CoveredDay = {
  /** ISO date, 'YYYY-MM-DD'. */
  date: string
  /** Weekday label, e.g. 'Monday'. */
  label: DayName
}

export type TargetWindow = {
  /** Which anchor drove the window: 'friday', 'monday', or 'override'. */
  anchor: 'friday' | 'monday' | 'override'
  /** The ISO date the plan should be prepped (may be undefined for overrides). */
  prepDay?: CoveredDay
  /** The days the plan covers. */
  coveredDays: CoveredDay[]
}

// ── Date helpers (UTC-based to stay deterministic regardless of TZ) ──────────

/** Parse an ISO 'YYYY-MM-DD' string into a UTC Date at midnight. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Format a UTC Date as an ISO 'YYYY-MM-DD' string. */
export function toISODate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Day-of-week name for a UTC Date. */
export function dayName(date: Date): DayName {
  return DAY_NAMES[date.getUTCDay()]
}

/** Return a new Date offset by `days` from `date` (UTC). */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/** Build a CoveredDay from a UTC Date. */
function coveredDay(date: Date): CoveredDay {
  return { date: toISODate(date), label: dayName(date) }
}

// ── Cadence resolution ───────────────────────────────────────────────────────

/**
 * Decide which anchor (Friday or Monday) governs a reference date. Friday and
 * Monday map to themselves. Every other day snaps to the anchor whose window it
 * most naturally falls into:
 *   Sat/Sun  → treat as the upcoming Monday planning cycle
 *   Tue–Thu  → treat as the prior Friday planning cycle (mid-week for Mon/Tue/Wed)
 */
function resolveAnchor(refDay: number): { anchor: 'friday' | 'monday'; shift: number } {
  // refDay: 0 = Sun … 6 = Sat
  switch (refDay) {
    case 5: // Friday
      return { anchor: 'friday', shift: 0 }
    case 1: // Monday
      return { anchor: 'monday', shift: 0 }
    case 6: // Saturday → next Monday's cycle (Monday is 2 days ahead)
      return { anchor: 'monday', shift: 2 }
    case 0: // Sunday → next Monday's cycle (Monday is 1 day ahead)
      return { anchor: 'monday', shift: 1 }
    case 2: // Tuesday → prior Friday's cycle (Friday was 4 days back)
      return { anchor: 'friday', shift: -4 }
    case 3: // Wednesday → prior Friday's cycle (Friday was 5 days back)
      return { anchor: 'friday', shift: -5 }
    case 4: // Thursday → upcoming Friday's cycle (Friday is 1 day ahead)
      return { anchor: 'friday', shift: 1 }
    default:
      return { anchor: 'friday', shift: 0 }
  }
}

export type ComputeWindowOptions = {
  /**
   * Explicit override. When `dates` is provided, those ISO dates become the
   * covered window verbatim (labels derived from each date). When `anchorDay`
   * is provided, force that anchor ('friday' | 'monday') regardless of the
   * reference date's real day-of-week.
   */
  override?: {
    dates?: string[]
    anchorDay?: 'friday' | 'monday'
  }
}

/**
 * Compute the target window for a reference date.
 *
 * @param referenceDate ISO 'YYYY-MM-DD' (or a Date). Defaults to today (UTC).
 */
export function computeTargetWindow(
  referenceDate?: string | Date,
  options: ComputeWindowOptions = {},
): TargetWindow {
  // Explicit list of covered dates wins outright.
  const overrideDates = options.override?.dates
  if (overrideDates && overrideDates.length > 0) {
    const coveredDays = overrideDates.map((iso) => coveredDay(parseISODate(iso)))
    return { anchor: 'override', coveredDays }
  }

  const ref =
    referenceDate === undefined
      ? new Date()
      : typeof referenceDate === 'string'
        ? parseISODate(referenceDate)
        : referenceDate

  // Normalize to a UTC-midnight date so day math is stable.
  const refUtc = new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()),
  )

  const forced = options.override?.anchorDay
  const { anchor, shift } = forced
    ? { anchor: forced, shift: 0 }
    : resolveAnchor(refUtc.getUTCDay())

  // Anchor date = the reference date shifted to the governing Friday/Monday.
  const anchorDate = addDays(refUtc, shift)

  if (anchor === 'friday') {
    // Prep Saturday (anchor + 1); cover Mon/Tue/Wed of the FOLLOWING week
    // (anchor + 3, +4, +5).
    const prepDay = coveredDay(addDays(anchorDate, 1))
    const coveredDays = [3, 4, 5].map((n) => coveredDay(addDays(anchorDate, n)))
    return { anchor, prepDay, coveredDays }
  }

  // Monday anchor: prep Wednesday (anchor + 2); cover Thu/Fri/Sat/Sun of THAT
  // week (anchor + 3, +4, +5, +6).
  const prepDay = coveredDay(addDays(anchorDate, 2))
  const coveredDays = [3, 4, 5, 6].map((n) => coveredDay(addDays(anchorDate, n)))
  return { anchor, prepDay, coveredDays }
}
