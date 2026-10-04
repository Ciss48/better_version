# Motion — Better Every Day

Principle: **subtle, satisfying, never showy.** Animate only `transform`, `opacity`, `background-color`, `border-color`, `color` and `width`. Under `prefers-reduced-motion: reduce`, set every duration to 1ms; state changes stay the same.

Easing tokens (`tokens.css`):
- `--ease-out-soft` `cubic-bezier(.2,.8,.2,1)`: movement, sheets, the progress bar.
- `--ease-spring` `cubic-bezier(.34,1.8,.5,1)`: a light overshoot, used for the tick.
- `--ease-spring-soft` `cubic-bezier(.34,1.6,.5,1)`: picking an energy level.
- `ease`: colour changes.

## 1. Ticking a task done (TaskItem, ReviewRow, matrix chip)
| t | Element | Property | From → to | Duration / easing |
|---|---|---|---|---|
| 0 | checkbox | background, border-color | transparent / ink-3 → success | 200ms ease |
| 0 | checkbox | transform | scale(1) → **scale(1.22)** | 280ms ease-spring |
| 240ms | checkbox | transform | scale(1.22) → scale(1) | 280ms ease-spring |
| 60ms | check path (SVG, `stroke-dasharray: 24`) | stroke-dashoffset | 24 → 0 (draws the tick) | 320ms ease |
| 0 | title | color | ink → ink-3 | 300ms ease |
| 0 | title | text-decoration-color (line-through always on) | transparent → ink-3 | 300ms ease |
| 0 | ProgressBar fill | width | old % → new % | 600ms ease-out-soft |

Un-ticking runs the reverse with no pop (scale stays at 1).

When the plan reaches 100%, the toast "Trọn vẹn 100%…" appears. No confetti.

Implementation: keep a `popId` in state for 240ms, or use a `motion` keyframe `[1, 1.22, 1]`.

## 2. Changing stepper step (Ritual)
| Element | Property | Value |
|---|---|---|
| Step bar | background-color | line → accent (current) → success (done), 300ms ease |
| Step content | opacity + translateY | outgoing: 1→0, 0→-8px over 150ms ease; incoming: 0→1, 8px→0 over 220ms ease-out-soft, starting 60ms later |
| Scroll container | scrollTop | instantly back to 0 when the step changes |
| Back | — | same animation reversed (translateY sign flipped) |

The "Tiếp tục" button moves from disabled (.45) to enabled with an opacity transition, 150ms.

## 3. Opening and closing bottom sheets (DatePicker sheet, MatrixBottomSheet)
| Phase | Element | Property | Value |
|---|---|---|---|
| Open | sheet | transform | translateY(100%) → 0, **280ms ease-out-soft** |
| Open | scrim | background | transparent → `--scrim`, 250ms ease |
| Close | sheet | transform | 0 → translateY(100%), 220ms ease-in (`cubic-bezier(.4,0,1,1)`) |
| Close | scrim | background | → transparent, 200ms |
| Drag (vaul) | sheet | translateY follows the finger; release past 30% height or at velocity > 0.5 closes it | — |

Focus moves to the sheet's title when it opens and returns to the trigger when it closes.

## 4. Desktop popover (DatePicker)
| Phase | Property | Value |
|---|---|---|
| Open | opacity 0→1, transform `translateY(-6px) scale(.97)` → none | 180ms opacity + 280ms transform, ease-out-soft; transform-origin = top of the anchor (bottom when flipped) |
| Close | opacity 1→0, scale → .97 | 120ms ease |

## 5. Progress bar updates
- `width` transitions over 600ms with ease-out-soft whenever the % changes (ticking, adding, dropping or moving tasks).
- The % number changes instantly. If you want a count-up, use 400ms ease-out with integer steps — optional.

## 6. Smaller interactions
| Interaction | Spec |
|---|---|
| TaskItem expand | toolbar height auto (Collapsible): opacity 0→1, 150ms; row background → hover, 180ms |
| Hover on rows and buttons | background-color, 150ms ease |
| Drag in the matrix | dragged chip opacity 1→.4; target quadrant background → matrix-drop plus a 2px ring, 150ms |
| Energy pick | circle background → success, scale 1→1.08, 220ms ease-spring-soft |
| Toast | in: translateY(8px)→0 + opacity, 200ms; stays 2.6s; out: opacity 150ms |
| Onboarding dots | width 10→34px + background, 300ms ease |
| Settings timeline | window segment left/width, 300ms ease |
| Switch | thumb moves (justify), 200ms; track colour, 200ms |
