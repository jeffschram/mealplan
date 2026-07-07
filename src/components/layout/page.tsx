import type { ReactNode } from 'react'

export function Page({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  // Optional header-level actions (e.g. an "Add" button), right-aligned on
  // wide screens and stacked under the title on narrow ones.
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}
