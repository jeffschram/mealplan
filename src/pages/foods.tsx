import { Page } from '@/components/layout/page'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const PLACEHOLDER_FOODS = [
  { name: 'Tomato', category: 'Vegetable', season: 'Summer' },
  { name: 'Butternut Squash', category: 'Vegetable', season: 'Fall' },
  { name: 'Asparagus', category: 'Vegetable', season: 'Spring' },
]

export function FoodsPage() {
  return (
    <Page
      title="Foods"
      description="Ingredients and their seasonality. Placeholder data."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Season</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {PLACEHOLDER_FOODS.map((food) => (
            <TableRow key={food.name}>
              <TableCell className="font-medium">{food.name}</TableCell>
              <TableCell>{food.category}</TableCell>
              <TableCell>{food.season}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Page>
  )
}
