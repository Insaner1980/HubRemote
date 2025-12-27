import { memo } from 'react'
import { User } from 'lucide-react'
import { jellyfinApi } from '../services'
import type { PersonInfo } from '../types'

interface CastListProps {
  people: PersonInfo[]
  title?: string
}

export const CastList = memo(function CastList({
  people,
  title = 'Cast & Crew',
}: CastListProps) {
  // Filter to actors and directors
  const cast = people.filter(
    (p) => p.Type === 'Actor' || p.Type === 'Director' || p.Type === 'Writer'
  )

  if (cast.length === 0) return null

  return (
    <section className="mt-6">
      <h3 className="text-lg font-semibold text-text-primary mb-3 px-4">{title}</h3>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {cast.slice(0, 20).map((person, index) => (
          <CastCard key={`${person.Id}-${index}`} person={person} />
        ))}
      </div>
    </section>
  )
})

function CastCard({ person }: { person: PersonInfo }) {
  const imageUrl = person.PrimaryImageTag
    ? jellyfinApi.getImageUrl(person.Id, 'Primary', {
        maxWidth: 150,
        quality: 85,
      })
    : null

  return (
    <div className="flex-shrink-0 w-20 text-center">
      {/* Avatar */}
      <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-bg-secondary">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={person.Name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-8 h-8 text-text-secondary" />
          </div>
        )}
      </div>

      {/* Name */}
      <p className="text-xs font-medium text-text-primary mt-2 line-clamp-2">
        {person.Name}
      </p>

      {/* Role */}
      {person.Role && (
        <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
          {person.Role}
        </p>
      )}
      {!person.Role && person.Type && (
        <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
          {person.Type}
        </p>
      )}
    </div>
  )
}
