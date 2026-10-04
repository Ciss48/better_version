'use client';

import { useState } from 'react';
import { CalendarMonth } from '@/components/history/CalendarMonth';
import { HabitCardGroup } from '@/components/onboarding/HabitCardGroup';
import { TimeChips } from '@/components/onboarding/TimeChips';
import { ReflectionForm } from '@/components/ritual/ReflectionForm';
import { ReviewRow } from '@/components/ritual/ReviewRow';
import { TomorrowPlanList } from '@/components/ritual/TomorrowPlanList';
import type { TomorrowItem } from '@/components/ritual/TomorrowPlanList';
import { DayEndChips } from '@/components/settings/DayEndChips';
import { Switch } from '@/components/settings/Switch';
import { TimeSelect } from '@/components/settings/TimeSelect';
import type { DaySummary, Decision, Habit, HHMM, ISODate, Reflection, Task } from '@/domain';

/**
 * Stateful wrappers for the gallery. The components themselves are
 * presentational, so every section that can be interacted with needs a
 * little state holder — these are it. Developer-facing, English only.
 */

export function ReviewRowDemo({ task, initial }: { task: Task; initial?: Decision }) {
  const [decision, setDecision] = useState<Decision | undefined>(initial);
  const [done, setDone] = useState(task.status === 'done');
  return (
    <ReviewRow
      task={done ? { ...task, status: 'done' } : { ...task, status: 'todo' }}
      decision={done ? undefined : decision}
      onToggleDone={() => {
        setDone(!done);
        setDecision(undefined);
      }}
      onDecide={setDecision}
    />
  );
}

export function ReflectionDemo({ initial }: { initial: Reflection }) {
  const [value, setValue] = useState(initial);
  return <ReflectionForm value={value} onChange={setValue} />;
}

export function TomorrowListDemo({ initial }: { initial: TomorrowItem[] }) {
  const [items, setItems] = useState(initial);
  return (
    <TomorrowPlanList
      items={items}
      onToggleMit={(id) =>
        setItems(items.map((item) => (item.id === id ? { ...item, mit: !item.mit } : item)))
      }
      onRemove={(id) => setItems(items.filter((item) => item.id !== id))}
      onAdd={(parsed) =>
        setItems([
          ...items,
          {
            id: `demo${items.length + 1}`,
            title: parsed.title,
            mit: parsed.mit,
            carried: false,
            postponedCount: 0,
            removable: true,
          },
        ])
      }
    />
  );
}

export function DayEndChipsDemo({ initial }: { initial: HHMM }) {
  const [value, setValue] = useState(initial);
  return <DayEndChips value={value} onChange={setValue} />;
}

export function SwitchDemo({ initial, ariaLabel }: { initial: boolean; ariaLabel: string }) {
  const [checked, setChecked] = useState(initial);
  return <Switch checked={checked} onCheckedChange={setChecked} ariaLabel={ariaLabel} />;
}

export function TimeSelectDemo({
  initial,
  options,
  ariaLabel,
}: {
  initial: HHMM;
  options: { value: HHMM; label: string }[];
  ariaLabel: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <TimeSelect value={value} options={options} onChange={setValue} ariaLabel={ariaLabel} />
  );
}

export function HabitDemo({ initial }: { initial: Habit }) {
  const [value, setValue] = useState(initial);
  return <HabitCardGroup value={value} onChange={setValue} />;
}

export function TimeChipsDemo({
  options,
  initial,
  ariaLabel,
}: {
  options: HHMM[];
  initial: HHMM;
  ariaLabel: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <TimeChips options={options} value={value} onChange={setValue} ariaLabel={ariaLabel} />
  );
}

export function CalendarMonthDemo({
  month,
  days,
  initial,
  summary,
  canPrev = true,
  canNext = false,
}: {
  month: string;
  days: DaySummary[];
  initial: ISODate;
  summary: { planned: number; total: number; avg: number } | null;
  canPrev?: boolean;
  canNext?: boolean;
}) {
  const [selected, setSelected] = useState(initial);
  return (
    <CalendarMonth
      month={month}
      days={days}
      selected={selected}
      onSelect={setSelected}
      summary={summary}
      canPrev={canPrev}
      canNext={canNext}
      onPrev={() => {}}
      onNext={() => {}}
    />
  );
}
