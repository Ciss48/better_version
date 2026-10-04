'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useCallback } from 'react';
import { t } from '@/lib/copy';
import { useShortcut } from '@/lib/hooks/use-shortcut';
import { useHydrated } from '@/lib/use-hydrated';
import { cn } from '@/lib/utils';
import { ConsistencyMini } from './ConsistencyMini';
import { NavItem } from './NavItem';
import { MORE_VIEWS, SIDEBAR_NAV, TAB_NAV, viewFromPathname } from './nav-config';

export interface AppShellProps {
  children: React.ReactNode;
}

/** Two overlapping circles — the logo mark from design/screenshots. */
function LogoMark({ size }: { size: 'sm' | 'md' }) {
  const box = size === 'md' ? 'size-[30px]' : 'size-6';
  const big = size === 'md' ? 'size-[22px] top-1' : 'size-[18px] top-[3px]';
  const small = size === 'md' ? 'size-[14px]' : 'size-[11px]';
  return (
    <span className={cn('relative shrink-0', box)} aria-hidden>
      <span className={cn('absolute left-0 rounded-full bg-success', big)} />
      <span className={cn('absolute right-0 top-0 rounded-full bg-accent', small)} />
    </span>
  );
}

function useThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();

  const isDark = hydrated && resolvedTheme === 'dark';
  const toggle = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  return { isDark, toggle };
}

const SHORTCUT_HINTS = [
  { kbd: 'N', labelKey: 'nav.shortcuts.add' },
  { kbd: 'M', labelKey: 'nav.shortcuts.matrix' },
  { kbd: 'E', labelKey: 'nav.shortcuts.ritual' },
  { kbd: 'T', labelKey: 'nav.shortcuts.theme' },
] as const;

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const view = viewFromPathname(pathname);
  const { isDark, toggle } = useThemeToggle();
  // `T` switches light / dark, unless the user is typing.
  useShortcut('t', toggle);

  const showTabs = view !== 'ritual';
  const ThemeIcon = isDark ? Sun : Moon;
  const themeLabel = isDark ? t('nav.theme.toLight') : t('nav.theme.toDark');

  return (
    <div className="flex min-h-dvh bg-bg text-ink">
      {/* ── Sidebar (≥720px) ─────────────────────────────────────────────── */}
      <aside className="hidden w-[248px] shrink-0 flex-col gap-5 overflow-y-auto px-4 pb-[18px] pl-5 pt-[26px] app:flex">
        <Link href="/today" className="flex items-center gap-2.5 rounded-pill pl-1.5">
          <LogoMark size="md" />
          <span className="flex flex-col">
            <span className="font-num text-[19px] leading-tight">{t('app.name')}</span>
            <span className="text-micro text-ink-3">{t('app.tagline')}</span>
          </span>
        </Link>

        <nav aria-label={t('app.name')} className="flex flex-col gap-0.5">
          {SIDEBAR_NAV.map((item) => (
            <NavItem
              key={item.key}
              href={item.href}
              icon={item.icon}
              label={t(item.labelKey)}
              active={view === item.key}
              tag={item.phase2 ? t('nav.tag.phase2') : undefined}
            />
          ))}
        </nav>

        <div className="flex-1" />

        <ConsistencyMini />

        <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-1.5 text-caption text-ink-3">
          {SHORTCUT_HINTS.map((hint) => (
            <span key={hint.kbd} className="inline-flex items-center gap-1.5">
              <kbd className="rounded-sm bg-surface px-1.5 py-0.5 font-mono text-[10.5px] text-ink-2">
                {hint.kbd}
              </kbd>
              {t(hint.labelKey)}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-label={t('nav.theme.aria')}
          className="flex h-10 items-center gap-2.5 rounded-pill border-[1.5px] border-line px-3.5 text-[13.5px] hover:bg-hover"
        >
          <ThemeIcon size={16} strokeWidth={2.75} aria-hidden />
          {themeLabel}
        </button>
      </aside>

      {/* ── Paper sheet ──────────────────────────────────────────────────── */}
      <main
        className={cn(
          'min-w-0 flex-1 bg-paper app:m-3 app:ml-0 app:rounded-panel',
          showTabs && 'pb-[110px] app:pb-0',
        )}
      >
        {/* Compact top bar (<720px) */}
        <div className="flex items-center justify-between px-[18px] pt-3.5 app:hidden">
          <Link href="/today" className="flex items-center gap-2 rounded-pill">
            <LogoMark size="sm" />
            <span className="font-num text-base">{t('app.name')}</span>
          </Link>
          <button
            type="button"
            onClick={toggle}
            aria-label={t('nav.theme.aria')}
            className="grid size-10 place-items-center rounded-full bg-line-2"
          >
            <ThemeIcon size={17} strokeWidth={2.75} aria-hidden />
          </button>
        </div>

        {children}
      </main>

      {/* ── Bottom tabs (<720px) ─────────────────────────────────────────── */}
      {showTabs ? (
        <nav
          aria-label={t('nav.more')}
          className="fixed inset-x-0 bottom-0 flex justify-around border-t-[1.5px] border-line-2 bg-bg px-2 pb-4 pt-2 app:hidden"
        >
          {TAB_NAV.map((tab) => {
            const active =
              view === tab.key || (tab.key === 'more' && view !== null && MORE_VIEWS.includes(view));
            const Icon = tab.icon;
            const label = t(tab.labelKey);
            return (
              <Link
                key={tab.key}
                href={tab.href}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 flex-1 flex-col items-center gap-[3px] py-1 text-micro',
                  active ? 'font-semibold text-ink' : 'font-medium text-ink-3',
                )}
              >
                <span
                  className={cn(
                    'grid h-[30px] w-[52px] place-items-center rounded-pill',
                    active && 'bg-surface',
                  )}
                >
                  <Icon size={19} strokeWidth={2.75} aria-hidden />
                </span>
                {label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
