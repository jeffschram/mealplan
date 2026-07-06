import { Page } from '@/components/layout/page'
import { Button } from '@/components/ui/button'

export function TodayPage() {
  return (
    <Page
      title="Today"
      description="Your plan for today. Placeholder page — content coming soon."
    >
      <div className="flex gap-3">
        <Button>Add meal</Button>
        <Button variant="outline">Skip day</Button>
      </div>
    </Page>
  )
}
