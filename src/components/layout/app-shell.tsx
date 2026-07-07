import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Today', end: true },
  { to: '/upcoming', label: 'Upcoming' },
  { to: '/foods', label: 'Foods' },
  { to: '/seasons', label: 'Seasons' },
  { to: '/meal-plans', label: 'Meal Plans' },
]

export function AppShell() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
          <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span
              aria-hidden
              className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-base"
            >
              🥕
            </span>
            <span className="font-[var(--font-heading)]">Mealplan</span>
          </span>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
