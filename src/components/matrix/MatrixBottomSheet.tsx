'use client';

import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import { quadrantOf } from '@/domain';
import type { Quadrant, Task } from '@/domain';
import { t } from '@/lib/copy';
import { cn } from '@/lib/utils';
import { QUADRANT_SUB, QUADRANT_TITLE } from './MatrixQuadrant';

export interface MatrixBottomSheetProps {
  open: boolean;
  task: Task | null;
  onSelect(q: Quadrant): void;
  onClose(): void;
}

const QUADRANTS: Quadrant[] = ['q1', 'q2', 'q3', 'q4'];

/** Mobile replacement for dragging: pick the quadrant from a 2x2 grid. */
export function MatrixBottomSheet({ open, task, onSelect, onClose }: MatrixBottomSheetProps) {
  const current = task === null ? null : quadrantOf(task);

  return (
    <Drawer
      open={open && task !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DrawerContent>
        <div className="flex flex-col gap-0.5 px-1">
          <DrawerTitle>{t('today.matrix.sheet.title')}</DrawerTitle>
          {task === null ? null : <DrawerDescription>{task.title}</DrawerDescription>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {QUADRANTS.map((quadrant) => {
            const isCurrent = current === quadrant;
            return (
              <button
                key={quadrant}
                type="button"
                onClick={() => onSelect(quadrant)}
                className={cn(
                  'flex min-h-24 flex-col items-start gap-1 rounded-tile p-3.5 text-left',
                  isCurrent
                    ? 'bg-matrix-current shadow-[inset_0_0_0_2px_var(--accent)]'
                    : 'bg-surface',
                )}
              >
                <span className="font-display text-base leading-tight">
                  {t(QUADRANT_TITLE[quadrant])}
                </span>
                <span className="text-[11.5px] leading-[1.3] text-ink-3">
                  {t(QUADRANT_SUB[quadrant])}
                </span>
                {isCurrent ? (
                  <span className="mt-auto text-[11px] font-bold text-accent-ink">
                    {t('today.matrix.sheet.current')}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <DrawerClose className="h-[50px] rounded-pill border-2 border-line bg-transparent text-body font-medium text-ink">
          {t('today.matrix.sheet.cancel')}
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  );
}
