import { Page } from '@/components/layout/page'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function SeasonsPage() {
  return (
    <Page
      title="Seasons"
      description="Browse foods and plans by season. Placeholder page."
    >
      <div className="max-w-xs">
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select a season" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="spring">Spring</SelectItem>
            <SelectItem value="summer">Summer</SelectItem>
            <SelectItem value="fall">Fall</SelectItem>
            <SelectItem value="winter">Winter</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Page>
  )
}
