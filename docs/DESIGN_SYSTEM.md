# HubRemote Design System

Dark cinema theme with red accent - designed for media browsing in low-light environments.

---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `background-primary` | `#0F0F0F` | Main app background |
| `background-secondary` | `#1A1A1A` | Cards, sidebar, modals |
| `background-hover` | `#252525` | Hover states, active items |
| `accent-primary` | `#DC2626` | Buttons, links, highlights, progress bars |
| `accent-hover` | `#EF4444` | Hover states for accent elements |
| `text-primary` | `#F9FAFB` | Headings, important text, titles |
| `text-secondary` | `#9CA3AF` | Descriptions, metadata, timestamps |
| `border` | `#2D2D2D` | Subtle separators, card borders |

### Color Usage Guidelines

```
┌─────────────────────────────────────────────────────────────┐
│ background-primary (#0F0F0F)                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ background-secondary (#1A1A1A) - Card                 │  │
│  │                                                       │  │
│  │  text-primary (#F9FAFB)     ← Title                   │  │
│  │  text-secondary (#9CA3AF)   ← Year • Rating • Genre   │  │
│  │                                                       │  │
│  │  ┌─────────────────────┐                              │  │
│  │  │ accent-primary      │ ← Play Button                │  │
│  │  │ (#DC2626)           │                              │  │
│  │  └─────────────────────┘                              │  │
│  │                                                       │  │
│  │  border (#2D2D2D) ─────────────────────────────────   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Typography

### Font Stack
```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

### Scale

| Element | Size | Weight | Color | Line Height |
|---------|------|--------|-------|-------------|
| Page Title | 32px (2rem) | 600 | text-primary | 1.2 |
| Section Heading | 24px (1.5rem) | 600 | text-primary | 1.3 |
| Card Title | 16px (1rem) | 600 | text-primary | 1.4 |
| Body Text | 14px (0.875rem) | 400 | text-primary | 1.5 |
| Metadata | 13px (0.8125rem) | 400 | text-secondary | 1.5 |
| Small/Caption | 12px (0.75rem) | 400 | text-secondary | 1.5 |

---

## Spacing

Base unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Tight spacing, icon gaps |
| `sm` | 8px | Button padding, small gaps |
| `md` | 16px | Card padding, section gaps |
| `lg` | 24px | Section spacing |
| `xl` | 32px | Page margins |
| `2xl` | 48px | Large section breaks |

---

## Components

### Buttons

**Primary (Accent)**
```
Background: accent-primary (#DC2626)
Hover: accent-hover (#EF4444)
Text: white
Padding: 8px 16px
Border-radius: 8px
```

**Secondary (Ghost)**
```
Background: transparent
Hover: background-hover (#252525)
Text: text-primary
Border: 1px solid border (#2D2D2D)
```

**Icon Button**
```
Background: transparent
Hover: background-hover (#252525)
Size: 40px × 40px
Border-radius: 50%
```

### Cards

```
Background: background-secondary (#1A1A1A)
Border: 1px solid border (#2D2D2D) (optional)
Border-radius: 12px
Hover: scale(1.02) + shadow
Transition: 200ms ease
```

### Progress Bar

```
Track: background-hover (#252525)
Fill: accent-primary (#DC2626)
Height: 4px (normal), 8px (hover)
Border-radius: full
```

### Input Fields

```
Background: background-secondary (#1A1A1A)
Border: 1px solid border (#2D2D2D)
Focus border: accent-primary (#DC2626)
Text: text-primary
Placeholder: text-secondary
Padding: 12px 16px
Border-radius: 8px
```

---

## Shadows

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.5);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.5);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
--shadow-card: 0 4px 20px rgba(0, 0, 0, 0.4);
```

---

## Transitions

```css
--transition-fast: 150ms ease;
--transition-normal: 200ms ease;
--transition-slow: 300ms ease;
```

---

## Breakpoints

| Name | Width | Usage |
|------|-------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Small desktop |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Large desktop |

---

## Z-Index Scale

| Layer | Value | Usage |
|-------|-------|-------|
| Base | 0 | Default content |
| Dropdown | 10 | Menus, popovers |
| Sticky | 20 | Sticky headers |
| Modal backdrop | 40 | Modal overlay |
| Modal | 50 | Modal content |
| Player | 50 | Fullscreen player |
| Toast | 60 | Notifications |

---

## Tailwind Classes Quick Reference

```jsx
// Backgrounds
className="bg-[#0F0F0F]"    // background-primary
className="bg-[#1A1A1A]"    // background-secondary
className="bg-[#252525]"    // background-hover

// Accent
className="bg-red-600"       // accent-primary (#DC2626)
className="hover:bg-red-500" // accent-hover (#EF4444)

// Text
className="text-gray-50"     // text-primary (#F9FAFB)
className="text-gray-400"    // text-secondary (#9CA3AF)

// Border
className="border-[#2D2D2D]" // border color

// Common patterns
className="bg-[#1A1A1A] rounded-xl p-4 hover:bg-[#252525] transition-colors"
className="text-gray-50 font-semibold text-2xl"
className="text-gray-400 text-sm"
```

---

## Accessibility

- Minimum contrast ratio: 4.5:1 for body text
- Focus states: 2px outline with accent-primary
- Interactive elements: minimum 44×44px touch target
- Reduced motion: respect `prefers-reduced-motion`
