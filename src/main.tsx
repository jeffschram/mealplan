import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './router'

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined

if (!convexUrl) {
  // Fail loudly in dev if the client URL isn't wired up.
  throw new Error(
    'Missing VITE_CONVEX_URL. Add it to .env (value = CONVEX_URL). ' +
      'Never expose CONVEX_API_KEY to the client.',
  )
}

const convex = new ConvexReactClient(convexUrl)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <RouterProvider router={router} />
    </ConvexProvider>
  </StrictMode>,
)
