'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageContainer } from '@/components/app-shell/PageContainer';
import { EmptyState } from '@/components/common/EmptyState';
import { Kbd } from '@/components/common/Kbd';
import { MatrixBoard } from '@/components/matrix/MatrixBoard';
import { ReflectionForm } from '@/components/ritual/ReflectionForm';
import { ReviewRow } from '@/components/ritual/ReviewRow';
import { RitualFooter } from '@/components/ritual/RitualFooter';
import { RitualSummary } from '@/components/ritual/RitualSummary';
import { Stepper } from '@/components/ritual/Stepper';
import { TomorrowPlanList } from '@/components/ritual/TomorrowPlanList';
import { TaskInput } from '@/components/today/TaskInput';
import { ViewToggle } from '@/components/today/ViewToggle';
import type { ViewMode } from '@/components/today/ViewToggle';
import { addDays, completion, ritualRemaining } from '@/domain';
import type { Decision, ParsedTask } from '@/domain';
import { useClock } from '@/lib/clock';
import { t, tRaw } from '@/lib/copy';
import { formatClock, formatWeekdayDayMonth } from '@/lib/format';
import { useIsDesktop } from '@/lib/hooks/use-media';
import { useShortcut } from '@/lib/hooks/use-shortcut';
import { showToast } from '@/lib/toast';
import { ScreenState } from '@/features/common/ScreenState';
import {
  consistencyView,
  ritualReviewTasks,
  ritualTomorrowItems,
  tasksOn,
} from '@/state/selectors';
import { emptyDraft, loadDraft, saveDraft } from '@/state/ritual-draft';
import type { RitualDraft } from '@/state/ritual-draft';
import { useStore } from '@/state/store';

/**
 * The evening ritual — design/handoff/screens.md §2.
 *
 * Ticking a task is applied the moment it happens: it is a fact about the day.
 * Everything else (move/drop decisions, the reflection, tomorrow's new tasks)
 * is a **draft** in localStorage until "Hoàn tất & đóng ngày", so leaving with
 * Esc and coming back loses nothing. `store.closeDay` then applies the whole
 * thing through the domain in one commit.
 */

const MIT_LIMIT = 3;

/** motion.md §2: incoming step content fades up over 220ms with ease-out-soft. */
const STEP_SECTION =
  'flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-[220ms] ' +
  '[animation-timing-function:var(--ease-out-soft)]';

function RitualBody() {
  const router = useRouter();
  const { today, now, settings } = useClock();
  const tomorrow = addDays(today, 1);

  const state = useStore();
  const { toggleDone, patchTask, closeDay, addTask, dropTask, setQuadrant } = state;
  const isDesktop = useIsDesktop();

  const [draft, setDraft] = useState<RitualDraft>(() => emptyDraft(today));
  const [tomorrowMode, setTomorrowMode] = useState<ViewMode>('list');
  const loadedFor = useRef<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // One draft per logical day; re-read it if the day rolls over mid-ritual.
  useEffect(() => {
    if (loadedFor.current === today) return;
    loadedFor.current = today;
    setDraft(loadDraft(today));
  }, [today]);

  const closed = state.dayLogs[today]?.closedAt != null;
  const step = closed ? 3 : draft.step;

  useShortcut('escape', () => router.push('/today'), { enabled: !closed });

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start' });
  }, [step]);

  function update(patch: Partial<RitualDraft>): void {
    setDraft((current) => {
      const next = { ...current, ...patch };
      saveDraft(next);
      return next;
    });
  }

  const reviewTasks = useMemo(() => ritualReviewTasks(state, today), [state, today]);
  const dayTasks = useMemo(() => tasksOn(state.tasks, today), [state.tasks, today]);
  const items = useMemo(
    () => ritualTomorrowItems(state, draft, today),
    [state, draft, today],
  );
  const remaining = ritualRemaining(dayTasks, draft.decisions);
  const mitCount = items.filter((item) => item.mit).length;

  function onDecide(taskId: string, decision: Decision | undefined): void {
    const decisions = { ...draft.decisions };
    if (decision === undefined) delete decisions[taskId];
    else decisions[taskId] = decision;
    update({ decisions });
  }

  function onToggleDone(taskId: string): void {
    void toggleDone(taskId);
    // A task that is done again needs no decision — drop whatever was chosen.
    if (draft.decisions[taskId] !== undefined) {
      const decisions = { ...draft.decisions };
      delete decisions[taskId];
      update({ decisions });
    }
  }

  /** The MIT cap is the domain's rule; step 3 only applies it early, in the UI. */
  function onToggleMit(id: string): void {
    const item = items.find((entry) => entry.id === id);
    if (item === undefined) return;
    if (!item.mit && mitCount >= MIT_LIMIT) {
      showToast('ritual.step3.mitMax');
      return;
    }

    const existing = state.tasks[id];
    if (existing !== undefined && existing.planDate === tomorrow) {
      // Already a real task on tomorrow: this is a normal edit, not a draft.
      void patchTask(id, { mit: !existing.mit });
      return;
    }
    if (existing !== undefined) {
      update({ tomorrowMit: { ...draft.tomorrowMit, [id]: !item.mit } });
      return;
    }
    update({
      tomorrowNew: draft.tomorrowNew.map((entry) =>
        entry.id === id ? { ...entry, parsed: { ...entry.parsed, mit: !item.mit } } : entry,
      ),
    });
  }

  function onAddTomorrow(parsed: ParsedTask): void {
    let next = parsed;
    if (parsed.mit && mitCount >= MIT_LIMIT) {
      showToast('ritual.step3.mitFullOnAdd');
      next = { ...parsed, mit: false };
    }
    update({
      tomorrowNew: [
        ...draft.tomorrowNew,
        { id: `new-${crypto.randomUUID()}`, parsed: next },
      ],
    });
  }

  // ── Tomorrow board (shown after closing) ────────────────────────────────
  // Unlike `items` above (a draft, mixing not-yet-real entries until the
  // ritual closes), these are the real `tasks` rows already on tomorrow's
  // date — editable the same way Today edits today's.
  const tomorrowBoardTasks = useMemo(
    () =>
      tasksOn(state.tasks, tomorrow).filter(
        (task) => task.status === 'todo' || task.status === 'done',
      ),
    [state.tasks, tomorrow],
  );
  const tomorrowBoardItems = useMemo(
    () =>
      tomorrowBoardTasks.map((task) => ({
        id: task.id,
        title: task.title,
        mit: task.mit,
        carried: false,
        postponedCount: task.postponedCount,
        removable: true,
      })),
    [tomorrowBoardTasks],
  );

  function onAddTomorrowClosed(parsed: ParsedTask): void {
    let next = parsed;
    const mitCount = tomorrowBoardTasks.filter((task) => task.mit).length;
    if (parsed.mit && mitCount >= MIT_LIMIT) {
      showToast('ritual.step3.mitFullOnAdd');
      next = { ...parsed, mit: false };
    }
    void addTask(tomorrow, next, 'tomorrow');
  }

  function onToggleMitClosed(id: string): void {
    const task = state.tasks[id];
    if (task === undefined) return;
    const mitCount = tomorrowBoardTasks.filter((entry) => entry.mit).length;
    if (!task.mit && mitCount >= MIT_LIMIT) {
      showToast('ritual.step3.mitMax');
      return;
    }
    void patchTask(id, { mit: !task.mit });
  }

  const steps = tRaw<string[]>('ritual.steps');
  const reflectionTouched =
    draft.reflection.energy !== 0 ||
    draft.reflection.good !== '' ||
    draft.reflection.improve !== '';

  // ── Summary ──────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const date = state.lastClose?.date ?? today;
    const log = state.lastClose?.result.dayLog ?? state.dayLogs[date];
    const after = tasksOn(state.tasks, date);
    const tomorrowAfter = tasksOn(state.tasks, addDays(date, 1)).filter(
      (task) => task.status === 'todo' || task.status === 'done',
    );
    return {
      date,
      ...completion(after),
      adhocDone: after.filter((task) => task.adhoc && task.status === 'done').length,
      moved: after.filter((task) => task.status === 'moved').length,
      dropped: after.filter((task) => task.status === 'dropped').length,
      energy: log?.energy ?? 0,
      good: log?.good ?? '',
      tomorrow: {
        items: tomorrowAfter.map((task) => ({ title: task.title, mit: task.mit })),
      },
      consistencyPlanned: consistencyView(state, today).planned,
    };
  }, [state, today]);

  return (
    <div ref={topRef} className="flex max-w-[680px] flex-col gap-7">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-label font-semibold uppercase tracking-[0.08em] text-ink-3">
            {t('ritual.kicker')}
          </span>
          <span className="text-body-sm text-ink-2">
            {t('ritual.meta', {
              date: formatWeekdayDayMonth(today),
              time: formatClock(now, settings.timezone),
            })}
          </span>
        </div>
        <button
          type="button"
          onClick={() => router.push('/today')}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-pill border-[1.5px] border-line px-3.5 text-[13.5px] transition-colors duration-[150ms] hover:bg-hover"
        >
          {t('ritual.later')}
          <Kbd className="text-[10.5px] text-ink-3">{t('common.escHint')}</Kbd>
        </button>
      </div>

      {step === 3 ? (
        <RitualSummary
          date={summary.date}
          pct={summary.pct}
          done={summary.done}
          total={summary.total}
          adhocDone={summary.adhocDone}
          moved={summary.moved}
          dropped={summary.dropped}
          energy={summary.energy}
          good={summary.good}
          tomorrow={summary.tomorrow}
          consistencyPlanned={summary.consistencyPlanned}
          onDone={() => router.push('/today')}
        />
      ) : (
        <Stepper
          steps={steps}
          current={step}
          onStepClick={(index) => update({ step: index as 0 | 1 | 2 })}
        />
      )}

      {step === 3 ? (
        <section key="tomorrow-board" className={`${STEP_SECTION} gap-5`}>
          <div className="flex flex-col gap-2">
            <h3 className="font-display text-display-xs">
              {t('ritual.step3.title', { tomorrow: formatWeekdayDayMonth(tomorrow) })}
            </h3>
            <p className="text-pretty text-ink-2">
              {t('ritual.step3.body', { lockAt: settings.lockTime })}
            </p>
          </div>

          <div className="flex flex-wrap items-start gap-3">
            <TaskInput
              locked={false}
              scope="tomorrow"
              showSyntax={false}
              onAdd={onAddTomorrowClosed}
              className="min-w-0 flex-1 basis-[280px]"
            />
            <ViewToggle value={tomorrowMode} onChange={setTomorrowMode} />
          </div>

          {tomorrowBoardTasks.length === 0 ? (
            <EmptyState title={t('ritual.step3.empty')} className="px-[18px] py-4" />
          ) : tomorrowMode === 'list' ? (
            <TomorrowPlanList
              items={tomorrowBoardItems}
              onToggleMit={onToggleMitClosed}
              onRemove={(id) => void dropTask(id)}
              onAdd={onAddTomorrowClosed}
              showInput={false}
            />
          ) : (
            <MatrixBoard
              tasks={tomorrowBoardTasks}
              interaction={isDesktop === false ? 'tap' : 'drag'}
              onSetQuadrant={(id, quadrant) => void setQuadrant(id, quadrant)}
              onToggleDone={(id) => void toggleDone(id)}
            />
          )}
        </section>
      ) : null}

      {step === 0 ? (
        <section key="step-1" className={`${STEP_SECTION} gap-5`}>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-display-lg">{t('ritual.step1.title')}</h1>
            <p className="text-pretty text-ink-2">{t('ritual.step1.body')}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            {reviewTasks.map((task) => (
              <ReviewRow
                key={task.id}
                task={task}
                decision={draft.decisions[task.id]}
                onToggleDone={() => onToggleDone(task.id)}
                onDecide={(decision) => onDecide(task.id, decision)}
              />
            ))}
          </div>
          <RitualFooter
            status={{ remaining }}
            primaryLabel={t('ritual.step1.cta')}
            disabled={remaining > 0}
            onNext={() => update({ step: 1 })}
            onBlockedClick={() => showToast('ritual.step1.blocked')}
          />
        </section>
      ) : null}

      {step === 1 ? (
        <section key="step-2" className={`${STEP_SECTION} gap-[22px]`}>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-display-lg">{t('ritual.step2.title')}</h1>
            <p className="text-ink-2">{t('ritual.step2.body')}</p>
          </div>
          <ReflectionForm
            value={draft.reflection}
            onChange={(reflection) => update({ reflection })}
          />
          <RitualFooter
            primaryLabel={t(reflectionTouched ? 'ritual.step2.cta' : 'ritual.step2.ctaEmpty')}
            onNext={() => update({ step: 2 })}
            onBack={() => update({ step: 0 })}
          />
        </section>
      ) : null}

      {step === 2 ? (
        <section key="step-3" className={`${STEP_SECTION} gap-5`}>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-display-lg">
              {t('ritual.step3.title', { tomorrow: formatWeekdayDayMonth(tomorrow) })}
            </h1>
            <p className="text-pretty text-ink-2">
              {t('ritual.step3.body', { lockAt: settings.lockTime })}
            </p>
          </div>
          <TomorrowPlanList
            items={items}
            onToggleMit={onToggleMit}
            onRemove={(id) =>
              update({ tomorrowNew: draft.tomorrowNew.filter((entry) => entry.id !== id) })
            }
            onAdd={onAddTomorrow}
          />
          <RitualFooter
            primaryLabel={t('ritual.step3.cta')}
            onNext={() => void closeDay(draft)}
            onBack={() => update({ step: 1 })}
          />
        </section>
      ) : null}
    </div>
  );
}

export function RitualScreen() {
  return (
    <PageContainer width="narrow">
      <ScreenState skeleton="ritual">
        <RitualBody />
      </ScreenState>
    </PageContainer>
  );
}
