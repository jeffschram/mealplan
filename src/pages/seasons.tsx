import { useMemo } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { Page } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

type Week = Doc<'seasonsCalendar'>
type Season = Week['season']

const SEASONS: Season[] = ['Spring', 'Summer', 'Autumn', 'Winter']

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// e.g. 'Mon Jul 7 – Sun Jul 13, 2026'. The end date is the Sunday six days
// after the Monday start. We only repeat the month/year when they differ
// between the two ends of the range.
function formatWeekRange(weekStartDate: number): string {
  const start = new Date(weekStartDate)
  const end = new Date(weekStartDate + 6 * 24 * 60 * 60 * 1000)

  const weekday = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short' })
  const month = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' })

  const sameMonth = start.getMonth() === end.getMonth()
  const sameYear = start.getFullYear() === end.getFullYear()

  const startLabel = sameMonth && sameYear
    ? `${weekday(start)} ${month(start)} ${start.getDate()}`
    : `${weekday(start)} ${month(start)} ${start.getDate()}${
        sameYear ? '' : `, ${start.getFullYear()}`
      }`

  const endLabel = `${weekday(end)} ${month(end)} ${end.getDate()}, ${end.getFullYear()}`

  return `${startLabel} – ${endLabel}`
}

// Index of the week whose [Monday, Monday+7) range contains `now`. Weeks are
// chronological and contiguous, so a linear scan is fine for 52 rows.
function findCurrentWeekIndex(weeks: Week[], now: number): number {
  return weeks.findIndex(
    (w) => now >= w.weekStartDate && now < w.weekStartDate + WEEK_MS,
  )
}

function WeekRow({
  week,
  isCurrent,
  onSetSeason,
}: {
  week: Week
  isCurrent: boolean
  onSetSeason: (id: Id<'seasonsCalendar'>, season: Season) => void
}) {
  return (
    <TableRow className={cn(isCurrent && 'bg-primary/10')}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span>{formatWeekRange(week.weekStartDate)}</span>
          {isCurrent ? (
            <Badge
              className="text-[10px] font-normal"
              title="This week's season drives meal generation"
            >
              Current week
            </Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground tabular-nums">
        {week.year} · W{String(week.weekNumber).padStart(2, '0')}
      </TableCell>
      <TableCell className="text-right">
        <Select
          value={week.season}
          onValueChange={(value) =>
            onSetSeason(week._id, value as Season)
          }
        >
          <SelectTrigger
            size="sm"
            className="ml-auto w-32"
            aria-label={`Season for ${formatWeekRange(week.weekStartDate)}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEASONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  )
}

export function SeasonsPage() {
  const weeks = useQuery(api.seasons.list)
  const setSeason = useMutation(api.seasons.setSeason)

  const onSetSeason = (id: Id<'seasonsCalendar'>, season: Season) => {
    // Fire-and-forget optimistic update — Convex re-runs the query so the row
    // reflects the new season immediately. No save button.
    void setSeason({ weekId: id, season })
  }

  const currentWeekIndex = useMemo(
    () => (weeks ? findCurrentWeekIndex(weeks, Date.now()) : -1),
    [weeks],
  )

  return (
    <Page
      title="Seasons"
      description="Assign a WildFit season to each week of the year. The current week's season drives meal generation. Changes save automatically."
    >
      {weeks === undefined ? (
        <p className="text-sm text-muted-foreground">Loading calendar…</p>
      ) : weeks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No weeks yet.</p>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead className="w-[55%]">Week</TableHead>
                <TableHead>Year · Week</TableHead>
                <TableHead className="text-right">Season</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeks.map((week, i) => (
                <WeekRow
                  key={week._id}
                  week={week}
                  isCurrent={i === currentWeekIndex}
                  onSetSeason={onSetSeason}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Page>
  )
}
