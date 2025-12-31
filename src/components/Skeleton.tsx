interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />
}

export function SkeletonText({ className = '' }: SkeletonProps) {
  return <div className={`skeleton-text ${className}`} />
}

export function SkeletonTitle({ className = '' }: SkeletonProps) {
  return <div className={`skeleton-title ${className}`} />
}

interface SkeletonCardProps {
  count?: number
  className?: string
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="skeleton-card" />
      <SkeletonTitle />
      <SkeletonText className="w-1/2" />
    </div>
  )
}

export function SkeletonCardGrid({ count = 6, className = '' }: SkeletonCardProps) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonRow({ count = 6, className = '' }: SkeletonCardProps) {
  return (
    <div className={`flex gap-4 overflow-hidden ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-36">
          <SkeletonCard />
        </div>
      ))}
    </div>
  )
}

export function SkeletonEpisode({ className = '' }: SkeletonProps) {
  return (
    <div className={`flex gap-4 p-3 ${className}`}>
      <div className="skeleton-thumb w-40 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonTitle />
        <SkeletonText />
        <SkeletonText className="w-3/4" />
      </div>
    </div>
  )
}

export function SkeletonHero({ className = '' }: SkeletonProps) {
  return (
    <div className={`relative h-[50vh] min-h-[400px] ${className}`}>
      <div className="skeleton absolute inset-0" />
      <div className="absolute bottom-0 left-0 right-0 p-8 space-y-4">
        <div className="skeleton h-10 w-1/3 rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-4 w-1/2 rounded" />
        <div className="flex gap-3 mt-4">
          <div className="skeleton h-10 w-28 rounded-lg" />
          <div className="skeleton h-10 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
