'use client';

import { notFound } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { GALLERY_SAMPLES } from '@/dev/fixtures';
import { t } from '@/lib/copy';
import { useHydrated } from '@/lib/use-hydrated';

const SAMPLE = GALLERY_SAMPLES.typeSpecimen;

/** Every `--color-*` token defined in src/styles/tokens.css, in source order. */
const COLOR_GROUPS: { title: string; tokens: string[] }[] = [
  { title: 'Surfaces', tokens: ['bg', 'paper', 'surface'] },
  { title: 'Text', tokens: ['ink', 'ink-2', 'ink-3'] },
  { title: 'Lines & states', tokens: ['line', 'line-2', 'hover'] },
  {
    title: 'Accent (terracotta)',
    tokens: ['accent', 'accent-hover', 'accent-pressed', 'accent-soft', 'accent-ink', 'on-accent'],
  },
  { title: 'Success (sage)', tokens: ['success', 'success-soft', 'success-ink'] },
  { title: 'Warning', tokens: ['warning-soft', 'warning-ink'] },
  {
    title: 'Matrix',
    tokens: [
      'matrix-q1',
      'matrix-q2',
      'matrix-q3',
      'matrix-q4',
      'matrix-drop',
      'matrix-drop-ring',
      'matrix-current',
    ],
  },
  {
    title: 'Heatmap',
    tokens: ['heat-empty', 'heat-none', 'heat-1', 'heat-2', 'heat-3', 'heat-4'],
  },
  { title: 'Scrim', tokens: ['scrim'] },
  {
    title: 'shadcn aliases',
    tokens: [
      'background',
      'foreground',
      'card',
      'card-foreground',
      'popover',
      'popover-foreground',
      'primary',
      'primary-foreground',
      'secondary',
      'secondary-foreground',
      'muted',
      'muted-foreground',
      'border',
      'input',
      'ring',
      'destructive',
      'accent-foreground',
      'sidebar',
      'sidebar-foreground',
      'sidebar-primary',
      'sidebar-primary-foreground',
      'sidebar-accent',
      'sidebar-accent-foreground',
      'sidebar-border',
      'sidebar-ring',
      'chart-1',
      'chart-2',
      'chart-3',
      'chart-4',
      'chart-5',
    ],
  },
];

const TYPE_SCALE = [
  'display-xl',
  'display-lg',
  'display-md',
  'display-sm',
  'display-xs',
  'body-lg',
  'body',
  'body-sm',
  'caption',
  'label',
  'micro',
];

const NUM_SCALE = ['num-xl', 'num-lg', 'num-md', 'num-sm'];

const RADII = ['sm', 'row', 'item', 'tile', 'card', 'panel', 'pill'];

const SHADOWS = ['sm', 'md', 'lg'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-display-sm">{title}</h2>
      {children}
    </section>
  );
}

export default function TokensPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();

  const isDark = hydrated && resolvedTheme === 'dark';
  const ThemeIcon = isDark ? Sun : Moon;

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-12 px-4 py-10 app:px-11">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-label font-semibold uppercase text-ink-3">{t('app.name')}</p>
            <h1 className="mt-2 text-display-lg">Design tokens</h1>
            <p className="mt-2 text-body text-ink-2">
              Reference page — <code className="font-mono text-body-sm">src/styles/tokens.css</code>.
              Not shipped in production.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={t('nav.theme.aria')}
            className="flex h-10 items-center gap-2.5 rounded-pill border-[1.5px] border-line px-3.5 text-[13.5px] hover:bg-hover"
          >
            <ThemeIcon size={16} strokeWidth={2.75} aria-hidden />
            {isDark ? t('nav.theme.toLight') : t('nav.theme.toDark')}
          </button>
        </header>

        <Section title="Colours">
          <div className="flex flex-col gap-7">
            {COLOR_GROUPS.map((group) => (
              <div key={group.title} className="flex flex-col gap-3">
                <h3 className="text-label font-semibold uppercase text-ink-3">{group.title}</h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                  {group.tokens.map((name) => (
                    <div
                      key={name}
                      className="flex flex-col gap-2 rounded-tile bg-paper p-3 ring-1 ring-line"
                    >
                      <span
                        className="h-12 w-full rounded-row ring-1 ring-inset ring-line"
                        style={{ background: `var(--color-${name})` }}
                      />
                      <code className="break-all font-mono text-micro text-ink-2">
                        --color-{name}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Type scale">
          <div className="flex flex-col gap-4 rounded-panel bg-paper p-6">
            {TYPE_SCALE.map((step) => (
              <div key={step} className="flex flex-col gap-1 border-b border-line pb-4 last:border-0">
                <code className="font-mono text-micro text-ink-3">text-{step}</code>
                <p
                  className={step.startsWith('display') ? 'font-display' : undefined}
                  style={{ fontSize: `var(--text-${step})`, lineHeight: `var(--text-${step}--line-height)` }}
                >
                  {SAMPLE}
                </p>
              </div>
            ))}
            {NUM_SCALE.map((step) => (
              <div key={step} className="flex flex-col gap-1 border-b border-line pb-4 last:border-0">
                <code className="font-mono text-micro text-ink-3">text-{step}</code>
                <p
                  className="font-num"
                  style={{ fontSize: `var(--text-${step})`, lineHeight: `var(--text-${step}--line-height)` }}
                >
                  87%
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Radii">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
            {RADII.map((name) => (
              <div
                key={name}
                className="flex h-24 flex-col items-center justify-center gap-2 bg-surface"
                style={{ borderRadius: `var(--radius-${name})` }}
              >
                <code className="font-mono text-micro text-ink-2">rounded-{name}</code>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Elevation">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-6 pb-6">
            {SHADOWS.map((name) => (
              <div
                key={name}
                className="flex h-24 items-center justify-center rounded-card bg-paper"
                style={{ boxShadow: `var(--shadow-${name})` }}
              >
                <code className="font-mono text-micro text-ink-2">shadow-{name}</code>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
