import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { TodayPage } from '@/pages/today'
import { UpcomingPage } from '@/pages/upcoming'
import { FoodsPage } from '@/pages/foods'
import { SeasonsPage } from '@/pages/seasons'
import { MealPlansPage } from '@/pages/meal-plans'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'upcoming', element: <UpcomingPage /> },
      { path: 'foods', element: <FoodsPage /> },
      { path: 'seasons', element: <SeasonsPage /> },
      { path: 'meal-plans', element: <MealPlansPage /> },
    ],
  },
])
