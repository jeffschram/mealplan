import { describe, expect, it } from 'vitest'
import { computeTargetWindow, dayName, parseISODate } from './cadence'

// 2026-07-06 is a Monday; 2026-07-10 is a Friday. Sanity-check the anchors.
describe('cadence day-of-week anchors', () => {
  it('parses real day-of-week correctly (no week-alignment assumptions)', () => {
    expect(dayName(parseISODate('2026-07-06'))).toBe('Monday')
    expect(dayName(parseISODate('2026-07-10'))).toBe('Friday')
  })

  it('Friday → covers Mon/Tue/Wed of the FOLLOWING week, prep Saturday', () => {
    const w = computeTargetWindow('2026-07-10') // Friday
    expect(w.anchor).toBe('friday')
    // Prep the next day (Saturday 2026-07-11).
    expect(w.prepDay).toEqual({ date: '2026-07-11', label: 'Saturday' })
    // Covers the following Mon/Tue/Wed.
    expect(w.coveredDays).toEqual([
      { date: '2026-07-13', label: 'Monday' },
      { date: '2026-07-14', label: 'Tuesday' },
      { date: '2026-07-15', label: 'Wednesday' },
    ])
  })

  it('Monday → covers Thu/Fri/Sat/Sun of THAT week, prep Wednesday', () => {
    const w = computeTargetWindow('2026-07-06') // Monday
    expect(w.anchor).toBe('monday')
    // Prep Wednesday (2026-07-08).
    expect(w.prepDay).toEqual({ date: '2026-07-08', label: 'Wednesday' })
    expect(w.coveredDays).toEqual([
      { date: '2026-07-09', label: 'Thursday' },
      { date: '2026-07-10', label: 'Friday' },
      { date: '2026-07-11', label: 'Saturday' },
      { date: '2026-07-12', label: 'Sunday' },
    ])
  })

  it('non-anchor days snap to a governing anchor', () => {
    // Wednesday 2026-07-08 snaps back to the prior Friday cycle.
    const wed = computeTargetWindow('2026-07-08')
    expect(wed.anchor).toBe('friday')
    // Sunday 2026-07-12 snaps forward to the next Monday cycle.
    const sun = computeTargetWindow('2026-07-12')
    expect(sun.anchor).toBe('monday')
  })
})

describe('cadence overrides', () => {
  it('explicit covered dates win outright', () => {
    const w = computeTargetWindow('2026-07-10', {
      override: { dates: ['2026-12-25', '2026-12-26'] },
    })
    expect(w.anchor).toBe('override')
    expect(w.coveredDays).toEqual([
      { date: '2026-12-25', label: 'Friday' },
      { date: '2026-12-26', label: 'Saturday' },
    ])
  })

  it('anchorDay override forces the anchor regardless of reference day', () => {
    // Reference is a Monday, but force the Friday cadence.
    const w = computeTargetWindow('2026-07-06', {
      override: { anchorDay: 'friday' },
    })
    expect(w.anchor).toBe('friday')
    // Friday-from-Monday: prep = Monday + 1, covers Monday + 3/4/5.
    expect(w.coveredDays.map((d) => d.date)).toEqual([
      '2026-07-09',
      '2026-07-10',
      '2026-07-11',
    ])
  })
})
