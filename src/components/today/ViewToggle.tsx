'use client';

import { LayoutGrid, List } from 'lucide-react';
import { Segmented } from '@/components/common/Segmented';
import { t } from '@/lib/copy';
import { useShortcut } from '@/lib/hooks/use-shortcut';

export type ViewMode = 'list' | 'matrix';

export interface ViewToggleProps {
  value: ViewMode;
  onChange(v: ViewMode): void;
  /** Registers `M` to switch between the two views. */
  enableShortcut?: boolean;
  className?: string;
}

/** List ⇄ Matrix. */
export function ViewToggle({ value, onChange, enableShortcut = false, className }: ViewToggleProps) {
  useShortcut('m', () => onChange(value === 'list' ? 'matrix' : 'list'), {
    enabled: enableShortcut,
  });

  return (
    <Segmented
      value={value}
      ariaLabel={t('today.view.aria')}
      onChange={onChange}
      className={className}
      options={[
        {
          value: 'list',
          label: (
            <>
              <List size={15} strokeWidth={2.75} aria-hidden />
              {t('today.view.list')}
            </>
          ),
        },
        {
          value: 'matrix',
          label: (
            <>
              <LayoutGrid size={15} strokeWidth={2.75} aria-hidden />
              {t('today.view.matrix')}
            </>
          ),
        },
      ]}
    />
  );
}
