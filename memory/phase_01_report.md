# Phase 01 — Scaffold & design system

**Run date:** 2026-10-04 · **Status:** complete · **Commit:** `phase-01: scaffold`

---

## What was done

1. **Preflight.** Node v24.11.1. `corepack enable` failed (no write access to
   `/usr/local/bin`) and corepack's bundled shim cannot run pnpm 12 (which now ships as a
   native binary with no `bin/pnpm.cjs`). Installed **pnpm 10.34.6** with
   `npm install -g pnpm@10` into the already-writable `~/.npm-global/bin`.
   The env file was already named `.env.local` — nothing renamed, contents never read.
   `git init` created the local repo (branch `master`).
2. **Scaffold.** `pnpm create next-app@latest /private/tmp/bed-scaffold --ts --tailwind
   --eslint --app --src-dir --import-alias "@/*" --use-pnpm --no-turbopack --skip-install`,
   then rsync'd into the repo root excluding `.git/`, `README.md`, `AGENTS.md` and the
   generated `CLAUDE.md`. `CLAUDE.md`, `docs/`, `tasks/`, `memory/`, `design/` untouched.
3. **Tokens & copy.** `design/handoff/tokens.css` → `src/styles/tokens.css` and
   `design/handoff/copy.vi.json` → `src/content/copy.vi.json`, byte-for-byte.
   `src/app/globals.css` written per the contract.
4. **Fonts & theme.** next/font Fraunces + Be Vietnam Pro + Caprasimo; `next-themes`
   `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`, `storageKey="bed-theme"`).
5. **shadcn.** `shadcn@4.21.1 init --preset nova --base base --css-variables`, then
   `add button`. Cleaned up after it (see "New findings").
6. **Copy helper + tests.** `src/lib/copy.ts` with `t()`, `tRaw()`, derived `CopyKey`;
   8 passing Vitest tests.
7. **Routes.** `/` → redirect `/today`; `(app)` group with today, ritual, stats, history,
   settings, goals, weekly, more; `onboarding` and `dev/tokens` outside the group.
8. **AppShell.** nav-config, NavItem, static ConsistencyMini, PageContainer, sidebar /
   bottom tabs, global `T` shortcut, theme toggle.
9. **/dev/tokens** reference page (404s when `NODE_ENV === 'production'`).

### Installed versions

| Package | Version |
|---|---|
| next | 16.3.8 (Turbopack) |
| react / react-dom | 19.2.8 |
| tailwindcss | 4.3.3 |
| shadcn CLI | 4.21.1 — preset **nova**, base **base** (Base UI), CSS variables yes |
| next-themes | 0.4.6 |
| lucide-react | 1.51.0 |
| vitest | 5.0.3 |
| pnpm | 10.34.6 · node | 24.11.1 |

---

## Results — Definition of Done

| Check | Result |
|---|---|
| `pnpm lint` | ✅ exit 0, no warnings |
| `pnpm typecheck` | ✅ exit 0 |
| `pnpm test` | ✅ 8 tests passing in `src/lib/copy.test.ts` (≥6 required) |
| `pnpm build` | ✅ 12 routes prerendered |
| 200 for `/today /ritual /stats /history /settings /goals /weekly /onboarding /more /dev/tokens` | ✅ all 200 |
| `/` redirects to `/today` | ✅ 307 → `http://localhost:3000/today` |
| `/today` HTML has `Hôm nay`, `lang="vi"`, 3 font variable classes | ✅ `<html lang="vi" class="fraunces_…__variable be_vietnam_pro_…__variable caprasimo_…__variable h-full antialiased">` |
| `/onboarding` HTML has no `Hành trình` | ✅ 0 matches |
| `diff design/handoff/tokens.css src/styles/tokens.css` | ✅ empty |
| `diff design/handoff/copy.vi.json src/content/copy.vi.json` | ✅ empty |
| no raw hex in `src/components` `src/app` `*.tsx` | ✅ 0 matches |
| `.gitignore` covers `.env.local` (`.env*`), no env file tracked | ✅ |
| `design/` unmodified at commit time | ✅ (one tool-caused edit, detected and reverted — see below) |

Extra checks run: `/dev/tokens` returns **404** under `pnpm start` (production);
`@media (min-width:45rem)` present in the built CSS, so the `app:` variant works;
the Fraunces `@font-face` carries the Vietnamese unicode-range
(`U+1EA0-1EF9, U+20AB, …`); `aria-current="page"` present on both the sidebar item and the
tab; the bottom tab bar is absent on `/ritual`.

---

## New findings

### Moderate (also logged in `memory/discoveries.md`)

1. **shadcn's CLI overwrote a read-only design file.** `shadcn init` auto-detected
   `design/handoff/tokens.css` as "the project's CSS file" and rewrote it with its own
   neutral oklch palette. Caught by diffing against the copy already made at
   `src/styles/tokens.css`, restored byte-for-byte, and `components.json` repointed at
   `src/app/globals.css`. A later `shadcn add button` left `design/` untouched.
2. **`next dev` writes into `CLAUDE.md`.** Next 16 appends a `<!-- BEGIN:nextjs-agent-rules -->`
   block to `CLAUDE.md` (and generates `AGENTS.md`) on every run. Stripped the block and set
   `agentRules: false` in `next.config.ts`; verified a later `next dev` adds nothing.
3. **shadcn v4 is Base UI, not Radix, and `cn` is its own package.** The installed CLI's
   default base pulls `@base-ui/react`, and `src/lib/utils.ts` is a re-export of the `cn`
   package (not `clsx` + `tailwind-merge`). `docs/plan.md` assumed classic shadcn/ui.
4. **`cn()` silently dropped token size classes.** tailwind-merge only knows Tailwind's
   built-in t-shirt scales, so it read `text-micro` as a *colour* and dropped it when
   `text-ink` followed in the same `cn()` call — the bottom-tab labels lost their 11px
   size. Fixed properly: `src/lib/utils.ts` now builds `cn` with `createCn({ extend: … })`
   registering the project's `text-*` and `rounded-*` token scales.

### Minor (handled here)

- **`design/` really lives at `design/handoff/`.** `CLAUDE.md` and the task file say
  `design/tokens.css`; the actual path is `design/handoff/tokens.css`. Used the real path
  everywhere; no file moved (design is read-only).
- **Nav icons follow the screenshots, not the task file's suggestions**, as the task file
  permits. today `House` (not `Sun`), stats `ChartColumnIncreasing` (not `TrendingUp`),
  history `Calendar`, weekly `CalendarCheck`, settings `Settings2` (not `Settings`);
  ritual `Moon`, goals `Target`, more `Menu` as specified.
- **Sidebar tagline.** The task file asks for logo + `app.tagline`; the desktop screenshots
  show the logo alone. Rendered the tagline as a small `text-micro text-ink-3` line under
  the wordmark — easy to delete if the user prefers the screenshot exactly.
- **`LayoutProps<'/'>`** (a Next 16 generated global) only exists after a build, so
  `tsc --noEmit` failed on a clean tree. Both layouts use explicit
  `{ children: React.ReactNode }` props instead.
- **ESLint was linting `design/`** (the prototype's `support.js` produced 2 errors +
  9 warnings). Added `design/**` to `globalIgnores` in `eslint.config.mjs`.
- **`useHydrated()`** (`src/lib/use-hydrated.ts`, `useSyncExternalStore`-based) replaces the
  usual `useState` + `useEffect` "mounted" trick, which React 19's
  `react-hooks/set-state-in-effect` rule rejects as an error. Used by the two theme toggles.
- **Missing shadcn variables** added to `globals.css`, each mapped to an existing token,
  never a raw colour: `--accent-foreground` → `--on-accent`, `--chart-1…5` → accent /
  success / heat, `--sidebar-*` → bg / ink / accent / hover / line, and
  `--radius-md/lg/xl/2xl/3xl` → the token radius scale. Also one base rule
  `*,::after,::before { border-color: var(--color-border) }`, because Tailwind v4 defaults
  `border` to `currentColor` and shadcn components assume the token border.
- **`@import "shadcn/tailwind.css"`** added to `globals.css` (shadcn v4 ships its keyframes,
  `data-*` variants and utilities there). Checked: it defines no colours, so it cannot fight
  `tokens.css`.
- **Removed the unused create-next-app demo SVGs** from `public/`.
- `vitest.config.ts` emits a harmless Vite warning about ESM-in-CJS config loading. Left as
  is — the contract pins the filename, and renaming to `.mts` or adding `"type": "module"`
  would be a bigger change than the warning is worth.

### Not reproduced / verified only partially

- **Visual comparison against the screenshots was not possible** — the Chrome extension is
  not connected in this environment, so no screenshots were taken. Markup, class names and
  text content were verified from the served HTML instead. See the eyeball list below.

---

## Decisions made

- **shadcn base = Base UI** (`--preset nova --base base`), the CLI's own default for 4.21.1,
  which is what the task file asked for ("style: default for the installed version").
- **`cn` is configured, not replaced.** Extending the merge config is cheaper and safer than
  hand-ordering class strings in every component, and it protects Phases 3–4 from the same
  silent-drop bug.
- **Vietnamese strings only ever come from `t()`.** The only hard-coded strings in the app
  are developer-facing labels on `/dev/tokens` ("Design tokens", "Colours", "Radii",
  "Elevation"), which never ship to production.
- **`/more` redirects to `/today` at ≥720px** via a `matchMedia('(min-width: 45rem)')`
  effect in the page, since the route is mobile-only and the breakpoint is a viewport one.

---

## Open issues

- Nothing blocking. The shell is unverified *visually* (see below).
- `public/` is now empty; a real favicon/app icon is still the Next.js default
  (`src/app/favicon.ico`).

---

## Input for the next phase

- **Phase 2 (`tasks/phase_02_domain.md`) is pure domain logic** — it needs none of the UI
  work here. `t()`, `tRaw()` and `CopyKey` are ready for use from `src/lib/copy.ts`.
- **The shadcn `--accent` clash is live.** `tokens.css` wins: `--accent` is terracotta.
  Any shadcn component added later that uses `bg-accent` / `text-accent-foreground` for a
  *hover tint* must have those swapped to `bg-hover` by hand. `--accent-foreground` is
  mapped to `--on-accent` so `bg-accent text-accent-foreground` reads correctly as
  "terracotta with paper-coloured text".
- **shadcn components are Base UI–based** (`@base-ui/react`), not Radix. Phase 3 should
  check Base UI's API when adding Dialog / Popover / Sheet / Tooltip / Switch, and dnd-kit
  integration is unaffected.
- **Always pass token size classes through the configured `cn`** from `@/lib/utils`. If a
  new token scale is added to `tokens.css` (`text-*`, `rounded-*`), register it in
  `src/lib/utils.ts` too, or `cn()` will drop it next to a colour class.
- **Before running any `shadcn` CLI command, confirm `components.json` still points at
  `src/app/globals.css`**, and diff `design/handoff/tokens.css` against
  `src/styles/tokens.css` afterwards.
- **Fraunces Vietnamese + `SOFT` works.** `axes: ['SOFT','opsz']` was accepted and the
  served `@font-face` includes the Vietnamese unicode-range, so headings stay in Fraunces.
  No fallback to Be Vietnam Pro 700 is needed.
- **ConsistencyMini takes `days?: ConsistencyDay[]`** (`{ date, hasPlan, pct, isToday }`)
  and renders 30 empty dots when given none. Phase 4 just has to feed it.
- **`AppShell` derives everything from `usePathname()`** — it takes only `children`, no
  `view`/`onNavigate` props. Later phases navigate with `next/link`, not callbacks.

---

## The user should eyeball

Run `pnpm dev` and open http://localhost:3000 — the shell was never compared against the
screenshots visually, so these are worth a look:

1. **Theme toggle.** Click the pill at the bottom of the sidebar (or the round button in the
   mobile top bar), and press **`T`** anywhere on the page. Light ↔ dark should flip with no
   flash on reload, and the choice should survive a refresh (`bed-theme` in localStorage).
2. **Fonts.** Headings must render in **Fraunces** with Vietnamese diacritics intact and the
   soft, rounded look (SOFT 100) — compare the H1 "Hôm nay" against
   `design/handoff/screenshots/desktop/today_window-open_light.png`. Body text is
   **Be Vietnam Pro**; the logo wordmark and "0/30" are **Caprasimo**.
3. **719 px vs 720 px.** Resize the window across 720px: at ≥720 the 248px sidebar and the
   rounded paper sheet (12px margin) appear; below it the sidebar disappears and the 5-tab
   bottom bar takes over. Nothing should overlap at the boundary.
4. **Sidebar proportions** against `design/handoff/screenshots/desktop/today_*_light.png`:
   248px width, 42px nav pills, "Phase 2" tags on Mục tiêu / Tổng kết tuần, the consistency
   card showing **0/30 ngày có plan** with 30 empty ringed dots, the N/M/E/T shortcut hints.
   **Note:** the tagline "Tiến bộ 1% mỗi ngày" under the wordmark is *not* in the
   screenshots — say the word and it goes.
5. **`/more` on mobile** against `design/handoff/screenshots/mobile/more-menu_light.png`
   (three large `bg-surface` rows). On a wide window `/more` should bounce you to `/today`.
6. **`/ritual`** should have **no** bottom tab bar; **`/onboarding`** should have neither
   sidebar nor tabs.
7. **`/dev/tokens`** — every colour swatch should look right in both themes, the type scale
   should render the Vietnamese sample cleanly at every step, and the radii/shadow tiles
   should match `tokens.css`. This page 404s in production by design.
