import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Food = Doc<'foods'>

export function DeleteFoodDialog({
  open,
  onOpenChange,
  food,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  food?: Food
}) {
  const remove = useMutation(api.foods.remove)
  const [removing, setRemoving] = useState(false)

  const handleDelete = async () => {
    if (!food) return
    setRemoving(true)
    try {
      await remove({ foodId: food._id })
      onOpenChange(false)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove {food?.name ?? 'food'}?</DialogTitle>
          <DialogDescription>
            This deletes “{food?.name}” from the pantry for good. This can’t be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={removing}
          >
            {removing ? 'Removing…' : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
