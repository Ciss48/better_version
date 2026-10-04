# Phase 01: Scaffold & design system

## Context Recap
Better Every Day is a Vietnamese daily-planning web app (see `docs/plan.md`). The design
is finished and lives in `design/` (read-only): `tokens.css`, `components.md`,
`screens.md`, `motion.md`, `copy.vi.json`, `screenshots/`, and a prototype written in a
custom non-React format. Nothing has been coded yet. The repo root currently contains
`CLAUDE.md`, `docs/`, `tasks/`, `memory/`, `design/` and a local env file with Supabase
keys. This phase creates the application frame every later phase builds on.

## Goal
A Next.js + TypeScript + Tailwind v4 + shadcn/ui app at the repo root that: uses the
design tokens and fonts, switches light/dark/system theme, serves every route as a
placeholder inside the real AppShell (sidebar ≥720px, bottom tabs <720px), exposes a
typed copy helper `t()`, has a `/dev/tokens` reference page, runs Vitest, and is committed
to a local git repo.

## Non-goals
- No business logic (planning window, %, MIT…) — that is Phase 2.
- No feature components (TaskItem, Banner, ProgressBar, Matrix, etc.) — Phase 3.
  The only real component built here is AppShell (+ NavItem, a static ConsistencyMini).
- No Supabase client, no auth, no database, **do not use the Supabase MCP**.
- No state library (zustand comes in Phase 4), no dnd-kit, no extra shadcn components
  beyond what Step 5 lists.
- Do not edit anything in `design/`. Do not copy `design/prototype/support.js`.
- No Prettier/Husky/CI setup, no README rewrite, no PWA.

## Interface Contract

### Files to create / own
```
package.json                      scripts below
tsconfig.json                     "strict": true, "resolveJsonModule": true, alias @/* → src/*
vitest.config.ts                  environment "node", include src/**/*.test.ts
components.json                   shadcn config (css → src/app/globals.css)
.gitignore                        must ignore .env, .env.*, node_modules, .next
src/app/layout.tsx                fonts, ThemeProvider, <html lang="vi" suppressHydrationWarning>
src/app/globals.css               see "CSS layering"
src/styles/tokens.css             byte-for-byte copy of design/tokens.css
src/content/copy.vi.json          byte-for-byte copy of design/copy.vi.json
src/lib/copy.ts                   t(), tRaw(), CopyKey
src/lib/copy.test.ts
src/lib/utils.ts                  cn() (shadcn)
src/components/theme-provider.tsx
src/components/app-shell/AppShell.tsx
src/components/app-shell/NavItem.tsx
src/components/app-shell/ConsistencyMini.tsx
src/components/app-shell/nav-config.ts
src/app/page.tsx                  redirect('/today')
src/app/(app)/layout.tsx          wraps children in <AppShell>
src/app/(app)/{today,ritual,stats,history,settings,goals,weekly,more}/page.tsx
src/app/onboarding/page.tsx       OUTSIDE (app) group → no shell
src/app/dev/tokens/page.tsx       notFound() when NODE_ENV === 'production'
```

### package.json scripts (exact names)
```json
{ "dev": "next dev", "build": "next build", "start": "next start",
  "lint": "<keep what create-next-app generated>", "typecheck": "tsc --noEmit", "test": "vitest run" }
```

### CSS layering (src/app/globals.css, in this order)
```css
@import "tailwindcss";
@import "tw-animate-css";          /* only if shadcn init added it */
@import "../styles/tokens.css";
/* font override: point token font families at next/font CSS variables */
@theme inline {
  --font-display: var(--font-fraunces), Georgia, serif;
  --font-sans: var(--font-be-vietnam), system-ui, sans-serif;
  --font-num: var(--font-caprasimo), Georgia, serif;
}
@layer base {
  body { @apply bg-bg text-ink font-sans; }
  .font-display, h1, h2, h3 { font-family: var(--font-display); font-weight: 600;
    font-variation-settings: "SOFT" 100; }
}
```
shadcn's init will try to write its own `:root { --background … }`, `.dark {…}` and an
`@theme inline` colour mapping into globals.css. **Remove those generated blocks** —
`tokens.css` already defines all shadcn aliases. If any shadcn variable is missing from
tokens.css (e.g. `--sidebar-*`, `--chart-*`, `--accent-foreground`), add it to
`globals.css` mapped to an existing token, never with a raw colour — log as Minor.

Note the name clash: shadcn uses `--accent` for a hover tint, but tokens.css uses
`--accent` for terracotta. **tokens.css wins.** When shadcn components are added later,
their `bg-accent` hover classes will be replaced with `bg-hover`. Record this in the phase
report under "Input for the next phase".

### Fonts (src/app/layout.tsx)
```ts
import { Fraunces, Be_Vietnam_Pro, Caprasimo } from 'next/font/google';
const fraunces  = Fraunces({ subsets: ['latin','latin-ext','vietnamese'], axes: ['SOFT','opsz'], variable: '--font-fraunces', display: 'swap' });
const beVietnam = Be_Vietnam_Pro({ subsets: ['latin','vietnamese'], weight: ['400','500','600','700'], variable: '--font-be-vietnam', display: 'swap' });
const caprasimo = Caprasimo({ subsets: ['latin'], weight: '400', variable: '--font-caprasimo', display: 'swap' });
// <html className={`${fraunces.variable} ${beVietnam.variable} ${caprasimo.variable}`}>
```
If a subset/axis is rejected by next/font at build time, use the closest supported
option and log it (Minor if Vietnamese text still renders in Fraunces; Moderate if
Fraunces cannot render Vietnamese at all — then headings fall back to Be Vietnam Pro 700).

### Theme
- `next-themes` `<ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="bed-theme">`.
- Theme toggle in AppShell cycles light ↔ dark (resolved theme). Keyboard shortcut `T`
  toggles too (ignored while focus is in input/textarea/select/contenteditable).

### Copy helper (src/lib/copy.ts)
```ts
import copy from '@/content/copy.vi.json';

/** Union of every dot-path in copy.vi.json whose value is a string. */
export type CopyKey = /* derived type, e.g. LeafPaths<typeof copy, string> */;

/** Returns the string at `key`, replacing {placeholder} with vars[placeholder]. */
export function t(key: CopyKey, vars?: Record<string, string | number>): string;

/** Returns any value (array/object) at a dot-path, for e.g. 'date.weekdayShort'. */
export function tRaw<T = unknown>(key: string): T;
```
Behaviour:
- Unknown key: throw in development/test; return the key string in production.
- Placeholder with no matching var: leave `{name}` untouched; `console.warn` in development.
- Vars are converted with `String(v)`.
- `CopyKey` must make `t('today.kicker')` compile and `t('today.nope')` a type error.
  If deriving the type is too slow for tsc, generate it with a small script into
  `src/content/copy-keys.ts` and add `"gen:copy": "tsx scripts/gen-copy-keys.ts"` (Minor).

### Navigation config (src/components/app-shell/nav-config.ts)
```ts
export type ViewKey = 'today'|'ritual'|'stats'|'history'|'settings'|'onboarding'|'goals'|'weekly'|'more';
export interface NavDef { key: ViewKey; href: string; labelKey: CopyKey; icon: LucideIcon; phase2?: boolean }
export const SIDEBAR_NAV: NavDef[];   // today, ritual, stats, history, goals(phase2), weekly(phase2), settings
export const TAB_NAV: NavDef[];       // today, ritual(label nav.tabs.ritual), stats, history, more
```
Icons (lucide-react, size 18, strokeWidth 2.75): today `Sun`, ritual `Moon`, stats
`TrendingUp`, history `CalendarDays`, goals `Target`, weekly `ChartColumn` (or
`BarChart3` if missing), settings `Settings`, more `Menu`. If the screenshots clearly
show a different glyph, match the screenshot (Minor).

### AppShell (spec: design/components.md → AppShell, NavItem, ConsistencyMini)
```ts
interface AppShellProps { children: React.ReactNode }
```
- Active view derived from `usePathname()`; `aria-current="page"` on the active item.
- **≥720px (`app:` variant):** 248px sidebar on `bg-bg` with logo (Caprasimo, `font-num`)
  + tagline (`app.tagline`), nav items (42px pills; active = `bg-paper` + font-semibold;
  Phase 2 items show tag `nav.tag.phase2`), ConsistencyMini, keyboard-shortcut hints
  (`nav.shortcuts.*` with `<kbd>`), theme toggle. Main content = a "paper" sheet:
  `bg-paper rounded-panel` with 12px margin, scrollable.
- **<720px:** top bar (logo + theme toggle), full-width paper, fixed bottom bar with 5 tabs
  (TAB_NAV), each ≥44px tall, `aria-label` from copy. Main content gets bottom padding
  110px.
- Bottom bar hidden on `/ritual`. The `/more` route is the mobile "More" list
  (Mục tiêu · Phase 2, Tổng kết tuần · Phase 2, Cài đặt) — implement it as simple large
  link buttons using copy keys; on ≥720px `/more` redirects to `/today`.
- ConsistencyMini in this phase renders 30 empty dots (`days=[]` → all "no plan" dots)
  and the label "0/30 ngày có plan" using copy keys. Real data arrives in Phase 4.
- Match `design/screenshots/desktop/today_*_light.png` and
  `design/screenshots/mobile/more-menu_light.png` for the shell's proportions.

### Placeholder pages
Each `(app)` page renders inside the shell: a kicker + H1 using the matching copy key
(e.g. `nav.today`), and for goals/weekly the Phase 2 notice text from copy if present.
Content max-widths from `design/screens.md` (Today/Ritual 760px, Stats/History/
Settings/Goals/Weekly 1080px, Onboarding 640px) applied via a shared
`<PageContainer width="narrow"|"wide"|"onboarding">` component in
`src/components/app-shell/PageContainer.tsx`. Main padding: 44px desktop, 20px 16px mobile.

### /dev/tokens page
Shows, in a grid: every colour token as a swatch with its name (all `--color-*` from
tokens.css), the full type scale (display-xl…micro, num-xl…num-sm) with a Vietnamese
sample sentence "Tiến bộ 1% mỗi ngày — Việc quan trọng nhất", radii, shadows. A theme
toggle at the top. Purpose: visual check that tokens + fonts work in both themes.

## Steps
1. **Preflight.** Check `node -v` (≥20) and `pnpm -v`; if pnpm is missing, run
   `corepack enable`. If the env file is named `.env`, rename it to `.env.local`
   (do not print its contents). Run `git init` if `.git` does not exist.
2. **Scaffold in a temp dir** (the root is not empty, so create-next-app may refuse):
   `pnpm create next-app@latest /tmp/bed-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm`
   (check `--help` if a flag is rejected; accept defaults for anything else, no
   experimental options). Copy everything except `.git` and `README.md` into the repo
   root without overwriting `CLAUDE.md`, `docs/`, `tasks/`, `memory/`, `design/`.
   Run `pnpm install`. Confirm Tailwind major version is 4 (`pnpm list tailwindcss`).
3. **Tokens & copy.** Copy `design/tokens.css` → `src/styles/tokens.css` and
   `design/copy.vi.json` → `src/content/copy.vi.json`. Write `globals.css` per contract.
4. **Fonts & theme.** Install `next-themes`. Implement layout.tsx fonts + ThemeProvider.
5. **shadcn.** `pnpm dlx shadcn@latest init` (style: default for the installed version,
   base colour: neutral, CSS variables: yes). Then clean globals.css per contract. Add
   only the `button` component as a smoke test; verify it renders with `bg-primary`
   = terracotta. Install `lucide-react` if init did not.
6. **Copy helper + tests.** Implement `src/lib/copy.ts`; install `vitest` (+ `tsx` if you
   generate keys); write `src/lib/copy.test.ts` with at least these cases:
   - `t('app.name')` → `'Better Every Day'`
   - `t('today.planStatus.open', { lockAt: '10:00' })` → `'Đang mở · khóa lúc 10:00'`
   - `t('today.progress.count', { done: 3, total: 5 })` → `'3/5 việc đã định'`
   - missing var leaves `{lockAt}` in the output
   - unknown key throws (cast with `as any`)
   - `tRaw<string[]>('date.weekdayShort')[1]` → `'T2'`
7. **Routes.** Create the route tree, `(app)/layout.tsx`, redirect on `/`,
   PageContainer, placeholder pages.
8. **AppShell.** Build nav-config, NavItem, ConsistencyMini (static), AppShell per
   contract; global `T` shortcut; theme toggle with `nav.theme.*` aria labels.
9. **/dev/tokens page.**
10. **Verify.** Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Start
    `pnpm dev` and curl each route (see DoD). Compare the shell against screenshots
    visually yourself if you can take screenshots; otherwise list what the user should
    eyeball in the report.
11. **Handoff** (below) and commit `phase-01: scaffold`.

## Definition of Done
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all exit 0.
- `pnpm test` runs ≥6 passing tests in `src/lib/copy.test.ts`.
- With `pnpm dev` running, `curl -s -o /dev/null -w "%{http_code}"` returns 200 for
  `/today /ritual /stats /history /settings /goals /weekly /onboarding /dev/tokens`
  (and `/more`); `/` returns a redirect (307/308) to `/today`.
- `curl -s localhost:3000/today` HTML contains `Hôm nay`, `lang="vi"`, and the three
  font CSS variable class names on `<html>`.
- `curl -s localhost:3000/onboarding` HTML does NOT contain the sidebar nav label
  `Hành trình`.
- `src/styles/tokens.css` is identical to `design/tokens.css`
  (`diff` prints nothing); same for `src/content/copy.vi.json`.
- `git diff --stat HEAD -- design/` is empty (design untouched) and `git status` is clean
  after the commit.
- `grep -rnE "#[0-9a-fA-F]{3,6}\b" src/components src/app --include=*.tsx` finds no raw
  hex colours (the /dev/tokens page may print token *names*, not hex literals).
- `.gitignore` contains a pattern covering `.env.local`; `git ls-files | grep -i env`
  shows no env file.

## Handoff Obligations
1. Write `memory/phase_01_report.md` (template sections: What was done / Results /
   New findings / Decisions made / Open issues / Input for the next phase). Include:
   installed versions of next, react, tailwindcss, shadcn CLI style chosen; how the
   shadcn `--accent` clash was handled; whether Fraunces Vietnamese + SOFT works;
   a short "user should eyeball" checklist (theme toggle, fonts, sidebar vs tabs at
   719/720px).
2. Overwrite `memory/STATE.md` with the current snapshot; next action =
   `tasks/phase_02_domain.md`.
3. Log Moderate/Major findings in `memory/discoveries.md`; stop early on Major.
4. Commit.
