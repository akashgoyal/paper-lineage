// Fixed-size placeholders that match the final layout, so nothing jumps when content arrives (CLS budget, §11.2).
export function SkeletonBlock({className = ''}: {className?: string}) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-line ${className}`} />
}

export function PageSkeleton() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 py-8 md:px-8" aria-busy="true" aria-label="Loading">
      <SkeletonBlock className="h-4 w-40" />
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-4">
          <SkeletonBlock className="h-12 w-3/4" />
          <SkeletonBlock className="h-5 w-1/2" />
          <SkeletonBlock className="h-24 w-full" />
          <SkeletonBlock className="h-64 w-full" />
        </div>
        <div className="flex flex-col gap-4">
          <SkeletonBlock className="h-56 w-full" />
          <SkeletonBlock className="h-40 w-full" />
        </div>
      </div>
    </main>
  )
}
