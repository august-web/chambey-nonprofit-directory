# Chambey Nonprofit Directory — Design Tokens

Tokens extracted from [chambey.org](https://chambey.org/) brand (March 2026) and adapted for the Nonprofit Directory data-dashboard context.

## Color System

### Brand Palette (from chambey.org)

| Token | Hex | Role |
|-------|-----|------|
| `--navy` | `#083049` | Primary brand color, headers, key UI chrome |
| `--cobalt` | `#066eb2` | Primary accent, links, primary actions, focus rings |
| `--sky` | `#159ac5` | Secondary accent, hover states |
| `--steel` | `#abcdd6` | Muted borders, dividers, disabled states |
| `--dark` | `#00202f` | Footer, overlay backgrounds |

### Data Dashboard Extensions

| Token | Hex | Role |
|-------|-----|------|
| `--bg` | `#f7f8fa` | Page background (cool-warm neutral) |
| `--surface` | `#ffffff` | Card/panel background |
| `--text-primary` | `#0f1420` | Body text (near-black) |
| `--text-secondary` | `#5b6778` | Secondary/meta text |
| `--text-muted` | `#9ca3af` | Placeholder, disabled text |
| `--border` | `#e2e6ed` | Default border |
| `--border-light` | `#f0f1f4` | Subtle divider |

### Semantic Status Colors

| Token | Hex | Role |
|-------|-----|------|
| `--green` | `#0d9488` | Active / compliant (teal-tone, not saturated green) |
| `--amber` | `#f0b914` | Caution / on revocation list |
| `--red` | `#dc2626` | Error / terminated (used sparingly) |

## Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-display` | `"Fraunces", Georgia, serif` | Wordmark, H1, data numbers |
| `--font-body` | `"DM Sans", system-ui, sans-serif` | All UI text, body copy |
| `--font-mono` | `"SF Mono", "Cascadia Code", "Fira Code", monospace` | EIN display, codes |

### Type Scale

| Token | Size | Line-height | Usage |
|-------|------|-------------|-------|
| `--text-xs` | `0.75rem` | `1.5` | Captions, meta |
| `--text-sm` | `0.875rem` | `1.5` | Secondary text, table cells |
| `--text-base` | `1rem` | `1.6` | Body |
| `--text-lg` | `1.125rem` | `1.5` | Section headings |
| `--text-xl` | `1.25rem` | `1.4` | Card titles |
| `--text-2xl` | `1.5rem` | `1.3` | Page headings |
| `--text-3xl` | `1.875rem` | `1.2` | Hero stats numbers |

### Letter Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--tracking-tight` | `-0.025em` | Headings |
| `--tracking-wide` | `0.05em` | Uppercase labels, wordmark |
| `--tracking-wider` | `0.1em` | Small caps, badge text |

## Spacing

Base unit: `0.25rem` (4px)

| Token | Rem | Px |
|-------|-----|----|
| `--space-1` | `0.25rem` | 4px |
| `--space-2` | `0.5rem` | 8px |
| `--space-3` | `0.75rem` | 12px |
| `--space-4` | `1rem` | 16px |
| `--space-5` | `1.25rem` | 20px |
| `--space-6` | `1.5rem` | 24px |
| `--space-8` | `2rem` | 32px |
| `--space-10` | `2.5rem` | 40px |
| `--space-12` | `3rem` | 48px |

## Borders & Radius

| Token | Value |
|-------|-------|
| `--radius-sm` | `4px` |
| `--radius-md` | `6px` |
| `--radius-lg` | `8px` |
| `--radius-xl` | `12px` |
| `--border-width` | `1px` |

## Shadows

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(8,48,73,0.06)` |
| `--shadow-md` | `0 4px 12px rgba(8,48,73,0.08)` |
| `--shadow-lg` | `0 8px 24px rgba(8,48,73,0.1)` |

## Breakpoints

| Label | Width | Target |
|-------|-------|--------|
| `--bp-sm` | `640px` | Mobile |
| `--bp-md` | `768px` | Tablet |
| `--bp-lg` | `1024px` | Small desktop |
| `--bp-xl` | `1280px` | Wide desktop |

## Transitions

| Token | Value |
|-------|-------|
| `--duration-fast` | `120ms` |
| `--duration-normal` | `200ms` |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` |

## Iconography

- Use inline SVG icons for status indicators, stat icons, chevrons
- Single color (`currentColor`), sized to match adjacent text
- Status badges use icon + color + text (triple encoding for accessibility)
