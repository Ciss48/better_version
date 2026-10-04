# Better Every Day — Developer handoff

Target stack: React + TypeScript + Tailwind CSS v4 + shadcn/ui. The interface language is Vietnamese.

| File | Contents |
|---|---|
| `tokens.css` | CSS variables for light and dark mode, the Tailwind v4 `@theme inline` block, and shadcn aliases |
| `components.md` | Every component: purpose, TypeScript props, variants, states, interaction, keyboard shortcuts, a11y |
| `screens.md` | Every screen: components used, desktop/mobile layout, breakpoint, all states, MVP vs Phase 2 |
| `copy.vi.json` | All interface text under hierarchical keys (`today.empty.title`, `ritual.step1.cta`…), with `{placeholder}` variables |
| `motion.md` | Micro-interaction specs: duration, easing, properties |
| `screenshots/` | `desktop/` (1280 px wide, full height) and `mobile/` (390×844), named `<screen>_<state>_<light|dark>.png` |
| `prototype/` | The full prototype source. Serve the folder (`npx serve prototype`) and open `Better Every Day.dc.html` for the canvas, or `BedApp.dc.html` for the standalone app |

## Notes
- **Fonts.** Organic's original fonts (Caprasimo/Figtree) have no Vietnamese glyphs, so we substitute:
  - **Fraunces** (`font-variation-settings: "SOFT" 100`, weight 600) for headings;
  - **Be Vietnam Pro** for UI and body text;
  - **Caprasimo** stays for numerals and the logo only.
- **Breakpoint.** It is measured on the app container: ≥720px uses the sidebar, <720px uses bottom tabs. Use a container query (`@container`) or the `--breakpoint-app` token.
- **Data.** Sample data is illustrative only; no schema is defined. The example "today" is Saturday 3/10/2026.
- **Weighted %.** MIT ×2 · L3 M2 S1. Adhoc (Phát sinh) and dropped tasks are excluded; moved tasks count as not done.
- **Copy tone.** Nothing is punitive: no red, no reproach. A negative delta gets a neutral tag.
- **Phase 2** (Goals, Weekly review, `@tên-mục-tiêu`) are placeholder screens. Do not develop them.
