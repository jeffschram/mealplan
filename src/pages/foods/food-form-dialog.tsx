import { useEffect, useMemo, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type Food = Doc<'foods'>
type Season = Food['seasonEligibility'][number]

const SEASONS: Season[] = ['Spring', 'Summer', 'Autumn', 'Winter']

export function FoodFormDialog({
  open,
  onOpenChange,
  food,
  groups,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  // When provided, the dialog edits this food; otherwise it creates a new one.
  food?: Food
  // Existing group names, to offer as quick-pick chips when adding.
  groups: string[]
}) {
  const create = useMutation(api.foods.create)
  const update = useMutation(api.foods.update)

  const isEdit = food !== undefined

  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [seasons, setSeasons] = useState<Set<Season>>(new Set())
  const [tier, setTier] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Reset the form to the target food (or empty) whenever it opens.
  useEffect(() => {
    if (!open) return
    setName(food?.name ?? '')
    setGroup(food?.group ?? '')
    setSeasons(new Set(food?.seasonEligibility ?? []))
    setTier(food?.tier ?? '')
    setNotes(food?.notes ?? '')
    setError(null)
    setSaving(false)
  }, [open, food])

  const toggleSeason = (season: Season) => {
    setSeasons((prev) => {
      const next = new Set(prev)
      if (next.has(season)) next.delete(season)
      else next.add(season)
      return next
    })
  }

  const orderedSeasons = useMemo(
    () => SEASONS.filter((s) => seasons.has(s)),
    [seasons],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (name.trim().length === 0) {
      setError('Please enter a food name.')
      return
    }
    if (group.trim().length === 0) {
      setError('Please choose or enter a food group.')
      return
    }

    setSaving(true)
    try {
      if (isEdit && food) {
        await update({
          foodId: food._id,
          name: name.trim(),
          group: group.trim(),
          seasonEligibility: orderedSeasons,
          tier: tier.trim(),
          notes: notes.trim(),
        })
      } else {
        await create({
          name: name.trim(),
          group: group.trim(),
          seasonEligibility: orderedSeasons,
          tier: tier.trim() ? tier.trim() : undefined,
          notes: notes.trim() ? notes.trim() : undefined,
        })
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit food' : 'Add a food'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the details and correct which seasons this food is eligible for.'
              : 'Add a food to the household pantry and mark which seasons it fits.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="food-name">Name</Label>
            <Input
              id="food-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Butternut squash"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="food-group">Group</Label>
            <Input
              id="food-group"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="e.g. Fruit, Proteins, Healthy Fats"
              list="food-group-options"
            />
            <datalist id="food-group-options">
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            {groups.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {groups.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGroup(g)}
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                      group === g
                        ? 'border-transparent bg-secondary text-secondary-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Season eligibility</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SEASONS.map((season) => {
                const checked = seasons.has(season)
                return (
                  <label
                    key={season}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                      checked
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleSeason(season)}
                    />
                    <span>{season}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="food-tier">
              Tier <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="food-tier"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              placeholder="e.g. middle"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="food-notes">
              Notes <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="food-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Substitutions, timing rules, etc."
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add food'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
