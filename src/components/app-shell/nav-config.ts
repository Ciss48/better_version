import {
  Calendar,
  CalendarCheck,
  ChartColumnIncreasing,
  House,
  type LucideIcon,
  Menu,
  Moon,
  Settings2,
  Target,
} from 'lucide-react';
import type { CopyKey } from '@/lib/copy';

export type ViewKey =
  | 'today'
  | 'ritual'
  | 'stats'
  | 'history'
  | 'settings'
  | 'onboarding'
  | 'goals'
  | 'weekly'
  | 'more';

export interface NavDef {
  key: ViewKey;
  href: string;
  labelKey: CopyKey;
  icon: LucideIcon;
  /** Designed but not built — the item carries a "Phase 2" tag. */
  phase2?: boolean;
}

/** Sidebar order at ≥720px. Icons match design/screenshots/desktop/today_*.png. */
export const SIDEBAR_NAV: NavDef[] = [
  { key: 'today', href: '/today', labelKey: 'nav.today', icon: House },
  { key: 'ritual', href: '/ritual', labelKey: 'nav.ritual', icon: Moon },
  { key: 'stats', href: '/stats', labelKey: 'nav.stats', icon: ChartColumnIncreasing },
  { key: 'history', href: '/history', labelKey: 'nav.history', icon: Calendar },
  { key: 'goals', href: '/goals', labelKey: 'nav.goals', icon: Target, phase2: true },
  { key: 'weekly', href: '/weekly', labelKey: 'nav.weekly', icon: CalendarCheck, phase2: true },
  { key: 'settings', href: '/settings', labelKey: 'nav.settings', icon: Settings2 },
];

/** Bottom tab order at <720px. Labels come from `nav.tabs.*`. */
export const TAB_NAV: NavDef[] = [
  { key: 'today', href: '/today', labelKey: 'nav.tabs.today', icon: House },
  { key: 'ritual', href: '/ritual', labelKey: 'nav.tabs.ritual', icon: Moon },
  { key: 'stats', href: '/stats', labelKey: 'nav.tabs.stats', icon: ChartColumnIncreasing },
  { key: 'history', href: '/history', labelKey: 'nav.tabs.history', icon: Calendar },
  { key: 'more', href: '/more', labelKey: 'nav.tabs.more', icon: Menu },
];

/** Entries of the mobile "More" list — everything the tab bar does not hold. */
export const MORE_NAV: NavDef[] = SIDEBAR_NAV.filter((n) =>
  (['goals', 'weekly', 'settings'] as ViewKey[]).includes(n.key),
);

/** Views the "Thêm" tab stays highlighted for. */
export const MORE_VIEWS: ViewKey[] = ['more', 'goals', 'weekly', 'settings'];

/** Maps a pathname onto the view it renders. */
export function viewFromPathname(pathname: string): ViewKey | null {
  const segment = pathname.split('/').filter(Boolean)[0];
  const known: ViewKey[] = [
    'today',
    'ritual',
    'stats',
    'history',
    'settings',
    'onboarding',
    'goals',
    'weekly',
    'more',
  ];
  return known.find((k) => k === segment) ?? null;
}
