# JellyRemote - Development Guide

Tauri + React app for Jellyfin media browsing and playback with MPV backend.

## Tech Stack

- **Frontend:** React 18 + TypeScript (strict mode)
- **Styling:** Tailwind CSS with custom design system
- **State:** Zustand (persisted config), React Query (API data)
- **Backend:** Tauri + Rust with MPV player integration
- **Build:** Vite

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AuthProvider     # Auth context wrapper
│   ├── MediaCard        # Movie/series card
│   ├── MediaRow         # Horizontal scrolling row
│   ├── HeroBanner       # Featured content banner
│   ├── EpisodeCard      # Episode list item
│   ├── CastList         # Actor/crew display
│   ├── FilterSidebar    # Library filters
│   ├── RemotePanel      # Playback controls
│   └── ProtectedRoute   # Auth guard
├── pages/
│   ├── Home             # Dashboard with resume, latest
│   ├── Library          # Browse with filters
│   ├── ItemDetail       # Movie/series details
│   ├── Player           # Fullscreen video player
│   ├── Remote           # Control other devices
│   └── Settings         # Server config, login
├── services/
│   ├── jellyfin.ts      # API client (axios)
│   └── player.ts        # MPV commands (Tauri invoke)
├── hooks/
│   └── useJellyfin.ts   # React Query hooks
├── stores/
│   ├── configStore.ts   # Server URL, auth tokens (persisted)
│   └── sessionStore.ts  # Active sessions state
├── contexts/
│   └── NavigationContext # In-app navigation with history
└── types/
    └── jellyfin.ts      # API type definitions

src-tauri/src/
├── main.rs              # Tauri entry
├── lib.rs               # Plugin setup
├── commands.rs          # Tauri commands
└── mpv.rs               # MPV player wrapper
```

## Design System

See `docs/DESIGN_SYSTEM.md` for full reference.

### Colors (Tailwind classes)
```
bg-bg-primary      #0F0F0F   Main background
bg-bg-secondary    #1A1A1A   Cards, modals
bg-bg-hover        #252525   Hover states
bg-accent-primary  #DC2626   Red accent (buttons)
bg-accent-hover    #EF4444   Light red hover
text-text-primary  #F9FAFB   White headings
text-text-secondary #9CA3AF  Gray metadata
border-border      #2D2D2D   Separators
```

### Component Classes
```css
.btn-primary      /* Red button */
.btn-secondary    /* Ghost with border */
.btn-ghost        /* Transparent hover */
.card             /* Secondary bg + border */
.card-hover       /* Card with hover effect */
.input            /* Text input field */
.metadata         /* Small gray text */
```

## Key Patterns

### API Data Fetching
```tsx
// Use React Query hooks from useJellyfin.ts
import { useItem, useLibraries, useResumeItems } from '../hooks/useJellyfin'

const { data, isLoading, error } = useItem(itemId)
```

### Config/Auth State
```tsx
// Zustand store - persisted to localStorage
import { useConfigStore } from '../stores/configStore'

const { serverUrl, accessToken, userId } = useConfigStore()
const isAuth = useConfigStore(s => s.isAuthenticated())
```

### Navigation
```tsx
// Custom navigation context (no react-router)
import { useNavigation } from '../contexts/NavigationContext'

const { navigate, navigateToItem, goBack } = useNavigation()
navigate('library')
navigateToItem(item.Id)
```

### MPV Player (Tauri)
```tsx
import { playerService } from '../services/player'

await playerService.init()
await playerService.playVideoWithOptions({ url, start_position, auth_token })
const state = await playerService.getState()  // { position, duration, is_paused, ... }
await playerService.togglePlayback()
await playerService.seek(positionSeconds)
await playerService.destroy()
```

### Images
```tsx
import { jellyfinApi } from '../services/jellyfin'

jellyfinApi.getImageUrl(itemId, 'Primary', { maxWidth: 400 })
jellyfinApi.getBackdropUrl(itemId)
jellyfinApi.getPrimaryUrl(itemId)
```

## Coding Standards

- TypeScript strict mode - no `any`, explicit types
- Components: small, focused, single responsibility
- Prefer `useCallback`/`useMemo` for expensive operations
- Error boundaries around pages
- Tailwind for styling, avoid inline styles
- Use design system colors, not raw hex values

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
npx tsc --noEmit     # Type check
npm run tauri dev    # Run Tauri app
npm run tauri build  # Build Tauri release
```

## Jellyfin API Notes

- Auth header: `X-Emby-Authorization: MediaBrowser Client="...", Token="..."`
- All endpoints need userId except public ones
- Item types: Movie, Series, Season, Episode, Audio, MusicAlbum
- Ticks: 1 second = 10,000,000 ticks
- Image types: Primary, Backdrop, Logo, Thumb, Banner

## Files to Know

| File | Purpose |
|------|---------|
| `services/jellyfin.ts` | All API methods |
| `services/player.ts` | MPV Tauri commands |
| `hooks/useJellyfin.ts` | React Query wrappers |
| `stores/configStore.ts` | Auth & server config |
| `contexts/NavigationContext.tsx` | App navigation |
| `pages/Player.tsx` | Video player UI |
| `src/index.css` | Design system base styles |
