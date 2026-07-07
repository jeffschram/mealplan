import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ThumbsUp, ThumbsDown, Minus, Pencil, Trash2, Plus } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { Page } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { FoodFormDialog } from './foods/food-form-dialog'
import { DeleteFoodDialog } from './foods/delete-food-dialog'

type Food = Doc<'foods'>
type Rating = Food['rating']

const RATINGS: {
  value: Rating
  label: string
  icon: typeof ThumbsUp
}[] = [
  { value: 'like', label: 'Like', icon: ThumbsUp },
  { value: 'neutral', label: 'Neutral', icon: Minus },
  { value: 'yuck', label: 'Yuck', icon: ThumbsDown },
]

const SEASON_ORDER = ['Spring', 'Summer', 'Autumn', 'Winter']

function RatingControl({
  food,
  onRate,
}: {
  food: Food
  onRate: (id: Id<'foods'>, rating: Rating) => void
}) {
  return (
    <div
      className="inline-flex overflow-hidden rounded-lg border border-border"
      role="group"
      aria-label={`Rating for ${food.name}`}
    >
      {RATINGS.map(({ value, label, icon: Icon }, i) => {
        const active = food.rating === value
        return (
          <Button
            key={value}
            type="button"
            size="sm"
            variant="ghost"
            aria-pressed={active}
            title={label}
            onClick={() => onRate(food._id, value)}
            className={cn(
              'rounded-none border-0',
              i > 0 && 'border-l border-border',
              active && value === 'like' && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
              active && value === 'neutral' && 'bg-muted text-foreground',
              active && value === 'yuck' && 'bg-destructive/15 text-destructive hover:bg-destructive/20',
              !active && 'text-muted-foreground',
            )}
          >
            <Icon />
            <span className="sr-only sm:not-sr-only">{label}</span>
          </Button>
        )
      })}
    </div>
  )
}

function FoodRow({
  food,
  onRate,
  onEdit,
  onDelete,
}: {
  food: Food
  onRate: (id: Id<'foods'>, rating: Rating) => void
  onEdit: (food: Food) => void
  onDelete: (food: Food) => void
}) {
  const liked = food.rating === 'like'
  const seasons = [...food.seasonEligibility].sort(
    (a, b) => SEASON_ORDER.indexOf(a) - SEASON_ORDER.indexOf(b),
  )
  return (
    <TableRow className={cn(liked && 'bg-primary/5')}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span>{food.name}</span>
          {food.provisional ? (
            <Badge
              variant="muted"
              className="text-[10px] font-normal opacity-70"
              title="Season eligibility is inferred / unverified"
            >
              provisional
            </Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {seasons.length === 0 ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            seasons.map((s) => (
              <Badge key={s} variant="secondary" className="font-normal">
                {s}
              </Badge>
            ))
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <RatingControl food={food} onRate={onRate} />
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title={`Edit ${food.name}`}
              aria-label={`Edit ${food.name}`}
              onClick={() => onEdit(food)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title={`Remove ${food.name}`}
              aria-label={`Remove ${food.name}`}
              onClick={() => onDelete(food)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

function FoodTable({
  foods,
  onRate,
  onEdit,
  onDelete,
}: {
  foods: Food[]
  onRate: (id: Id<'foods'>, rating: Rating) => void
  onEdit: (food: Food) => void
  onDelete: (food: Food) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[36%]">Name</TableHead>
          <TableHead>Seasons</TableHead>
          <TableHead className="text-right">Rating</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {foods.map((food) => (
          <FoodRow
            key={food._id}
            food={food}
            onRate={onRate}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </TableBody>
    </Table>
  )
}

export function FoodsPage() {
  const foods = useQuery(api.foods.list)
  const setRating = useMutation(api.foods.setRating)

  // Dialog state: `formFood` distinguishes add (undefined + formOpen) from
  // edit (a specific food). `deleteFood` drives the confirm dialog.
  const [formOpen, setFormOpen] = useState(false)
  const [formFood, setFormFood] = useState<Food | undefined>(undefined)
  const [deleteFood, setDeleteFood] = useState<Food | undefined>(undefined)

  const onRate = (id: Id<'foods'>, rating: Rating) => {
    // Fire-and-forget; Convex re-runs the query so the row re-groups itself.
    void setRating({ foodId: id, rating })
  }

  const openAdd = () => {
    setFormFood(undefined)
    setFormOpen(true)
  }

  const openEdit = (food: Food) => {
    setFormFood(food)
    setFormOpen(true)
  }

  const { groups, yuck, groupNames } = useMemo(() => {
    const active = (foods ?? []).filter((f) => f.rating !== 'yuck')
    const yuck = (foods ?? []).filter((f) => f.rating === 'yuck')
    const byGroup = new Map<string, Food[]>()
    for (const f of active) {
      const list = byGroup.get(f.group) ?? []
      list.push(f)
      byGroup.set(f.group, list)
    }
    const groups = [...byGroup.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    )
    // Unique group names across all foods (including yuck), for the form picker.
    const groupNames = [...new Set((foods ?? []).map((f) => f.group))].sort(
      (a, b) => a.localeCompare(b),
    )
    return { groups, yuck, groupNames }
  }, [foods])

  return (
    <Page
      title="Foods"
      description="Curate household preferences. Like foods get prioritized in generated plans; yuck foods sink to the bottom and are avoided. Changes save automatically."
      actions={
        <Button type="button" onClick={openAdd}>
          <Plus />
          Add food
        </Button>
      }
    >
      <FoodFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        food={formFood}
        groups={groupNames}
      />
      <DeleteFoodDialog
        open={deleteFood !== undefined}
        onOpenChange={(open) => {
          if (!open) setDeleteFood(undefined)
        }}
        food={deleteFood}
      />

      {foods === undefined ? (
        <p className="text-sm text-muted-foreground">Loading foods…</p>
      ) : foods.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No foods yet — add your first one to start stocking the pantry.
          </p>
          <Button type="button" onClick={openAdd}>
            <Plus />
            Add food
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(([group, list]) => (
            <section key={group} className="space-y-2.5">
              <div className="flex items-baseline gap-2">
                <h2 className="text-base font-semibold tracking-tight">
                  {group}
                </h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  {list.length}
                </span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
                <FoodTable
                  foods={list}
                  onRate={onRate}
                  onEdit={openEdit}
                  onDelete={setDeleteFood}
                />
              </div>
            </section>
          ))}

          {yuck.length > 0 ? (
            <section className="space-y-2.5 opacity-70">
              <div className="flex items-baseline gap-2">
                <h2 className="text-base font-semibold tracking-tight text-muted-foreground">
                  Not for us
                </h2>
                <span className="text-xs text-muted-foreground">
                  {yuck.length} — hidden from generated plans
                </span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-dashed border-border bg-card/60">
                <FoodTable
                  foods={yuck}
                  onRate={onRate}
                  onEdit={openEdit}
                  onDelete={setDeleteFood}
                />
              </div>
            </section>
          ) : null}
        </div>
      )}
    </Page>
  )
}
