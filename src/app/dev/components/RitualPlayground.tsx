'use client';

import { useReducer, useState } from 'react';
import { ReflectionForm } from '@/components/ritual/ReflectionForm';
import { ReviewRow } from '@/components/ritual/ReviewRow';
import { RitualFooter } from '@/components/ritual/RitualFooter';
import { RitualSummary } from '@/components/ritual/RitualSummary';
import { Stepper } from '@/components/ritual/Stepper';
import { TomorrowPlanList } from '@/components/ritual/TomorrowPlanList';
import type { TomorrowItem } from '@/components/ritual/TomorrowPlanList';
import {
  addDays,
  closeDay,
  completion,
  consistency,
  DEFAULT_SETTINGS,
  patchTask,
  ritualRemaining,
  toggleDone,
} from '@/domain';
import type {
  CloseDayInput,
  Ctx,
  Decision,
  DayLog,
  ISODate,
  Mutation,
  ParsedTask,
  Reflection,
  Task,
} from '@/domain';
import {
  otherTargets,
  RITUAL_CLOCK,
  sampleTasks,
  statsDays,
  TODAY,
  tomorrowExisting,
} from '@/dev/fixtures';
import { ClockProvider } from '@/lib/clock';
import { t, tRaw } from '@/lib/copy';
import { formatDateLong } from '@/lib/format';
import { noticeKey, showToast } from '@/lib/toast';

/**
 * The evening ritual, wired to the real domain. Like the Today playground this
 * is one of the only two places outside tests that call mutating domain
 * functions — the components below stay presentational.
 */

const TOMORROW: ISODate = addDays(TODAY, 1);

let idSeq = 0;

const CTX: Ctx = {
  now: RITUAL_CLOCK.now,
  settings: DEFAULT_SETTINGS,
  newId: () => `rp${++idSeq}`,
};

function initialTasks(): Task[] {
  return [...sampleTasks(), ...tomorrowExisting(), ...Object.values(otherTargets()).flat()];
}

function reducer(tasks: Task[], mutation: Mutation | 'reset'): Task[] {
  if (mutation === 'reset') return initialTasks();

  const byId = new Map(tasks.map((task) => [task.id, task]));
  for (const upsert of mutation.upserts) byId.set(upsert.id, upsert);
  for (const id of mutation.deletes) byId.delete(id);

  return [...byId.values()].sort((a, b) =>
    a.planDate === b.planDate ? a.position - b.position : a.planDate < b.planDate ? -1 : 1,
  );
}

const EMPTY_REFLECTION: Reflection = { energy: 0, good: '', improve: '' };

/** motion.md §2: incoming step content fades up over 220ms with ease-out-soft. */
const STEP_SECTION =
  'flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-[220ms] ' +
  '[animation-timing-function:var(--ease-out-soft)]';

interface NewItem {
  id: string;
  parsed: ParsedTask;
}

interface Closed {
  dayLog: DayLog;
  pct: number;
  done: number;
  total: number;
  moved: number;
  dropped: number;
  adhocDone: number;
  tomorrowCount: number;
  tomorrowMitTitles: string[];
}

export function RitualPlayground() {
  const [tasks, dispatch] = useReducer(reducer, undefined, initialTasks);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [reflection, setReflection] = useState<Reflection>(EMPTY_REFLECTION);
  const [added, setAdded] = useState<NewItem[]>([]);
  const [newMit, setNewMit] = useState<Record<string, boolean>>({});
  const [carriedMit, setCarriedMit] = useState<Record<string, boolean>>({});
  const [closed, setClosed] = useState<Closed | null>(null);

  const todayTasks = tasks.filter((task) => task.planDate === TODAY);
  const tomorrowTasks = tasks.filter((task) => task.planDate === TOMORROW);
  const reviewable = todayTasks.filter(
    (task) => task.status === 'todo' || task.status === 'done',
  );
  const remaining = ritualRemaining(todayTasks, decisions);

  function apply(mutation: Mutation) {
    for (const notice of mutation.notices) showToast(noticeKey(notice, 'add', 'tomorrow'));
    dispatch(mutation);
  }

  function onToggleDone(task: Task) {
    apply(toggleDone(task, CTX));
    // Ticking a task re-opens it: whatever was decided no longer applies.
    setDecisions((current) => {
      const next = { ...current };
      delete next[task.id];
      return next;
    });
  }

  function onDecide(task: Task, decision: Decision | undefined) {
    setDecisions((current) => {
      const next = { ...current };
      if (decision === undefined) delete next[task.id];
      else next[task.id] = decision;
      return next;
    });
  }

  /** The three sources of tomorrow's plan, in the order the design lists them. */
  const carried = reviewable.filter((task) => {
    const decision = decisions[task.id];
    return decision !== undefined && decision.kind === 'move' && decision.date === TOMORROW;
  });

  const items: TomorrowItem[] = [
    ...carried.map((task) => ({
      id: task.id,
      title: task.title,
      mit: carriedMit[task.id] ?? task.mit,
      carried: true,
      // The move has not happened yet; it will add one.
      postponedCount: task.postponedCount + 1,
      removable: false,
    })),
    ...tomorrowTasks.map((task) => ({
      id: task.id,
      title: task.title,
      mit: task.mit,
      carried: false,
      postponedCount: task.postponedCount,
      removable: false,
    })),
    ...added.map((item) => ({
      id: item.id,
      title: item.parsed.title,
      mit: newMit[item.id] ?? item.parsed.mit,
      carried: false,
      postponedCount: 0,
      removable: true,
    })),
  ];

  function onToggleMit(id: string) {
    const carriedTask = carried.find((task) => task.id === id);
    if (carriedTask !== undefined) {
      setCarriedMit((current) => ({
        ...current,
        [id]: !(current[id] ?? carriedTask.mit),
      }));
      return;
    }
    const existing = tomorrowTasks.find((task) => task.id === id);
    if (existing !== undefined) {
      apply(patchTask(existing, { mit: !existing.mit }, tomorrowTasks, CTX));
      return;
    }
    const item = added.find((entry) => entry.id === id);
    if (item !== undefined) {
      setNewMit((current) => ({ ...current, [id]: !(current[id] ?? item.parsed.mit) }));
    }
  }

  function finish() {
    const targets: Record<ISODate, Task[]> = {};
    for (const decision of Object.values(decisions)) {
      if (decision.kind !== 'move' || decision.date === TOMORROW) continue;
      targets[decision.date] = tasks.filter((task) => task.planDate === decision.date);
    }

    const input: CloseDayInput = {
      date: TODAY,
      todayTasks,
      decisions,
      tomorrowExisting: tomorrowTasks,
      tomorrowMit: carriedMit,
      tomorrowNew: added.map((item) => ({
        ...item.parsed,
        mit: newMit[item.id] ?? item.parsed.mit,
      })),
      otherTargets: targets,
      reflection,
    };

    const result = closeDay(input, CTX);
    apply(result);

    const after = todayTasks.map(
      (task) => result.upserts.find((upsert) => upsert.id === task.id) ?? task,
    );
    const planned = after.filter((task) => !task.adhoc);
    const adhoc = after.filter((task) => task.adhoc);
    const tomorrowAfter = [
      ...tomorrowTasks,
      ...result.upserts.filter((task) => task.planDate === TOMORROW),
    ].filter(
      (task, index, list) => list.findIndex((other) => other.id === task.id) === index,
    );

    setClosed({
      dayLog: result.dayLog,
      ...completion(planned),
      moved: after.filter((task) => task.status === 'moved').length,
      dropped: after.filter((task) => task.status === 'dropped').length,
      adhocDone: adhoc.filter((task) => task.status === 'done').length,
      tomorrowCount: tomorrowAfter.length,
      tomorrowMitTitles: tomorrowAfter.filter((task) => task.mit).map((task) => task.title),
    });
  }

  function reset() {
    dispatch('reset');
    setStep(0);
    setDecisions({});
    setReflection(EMPTY_REFLECTION);
    setAdded([]);
    setNewMit({});
    setCarriedMit({});
    setClosed(null);
  }

  const steps = tRaw<string[]>('ritual.steps');
  const reflectionTouched =
    reflection.energy !== 0 || reflection.good !== '' || reflection.improve !== '';

  return (
    <ClockProvider value={RITUAL_CLOCK}>
      <div className="flex max-w-[680px] flex-col gap-7">
        <div className="flex flex-col gap-0.5">
          <span className="text-label font-semibold uppercase tracking-[0.08em] text-ink-3">
            {t('ritual.kicker')}
          </span>
          <span className="text-body-sm text-ink-2">
            {t('ritual.meta', { date: formatDateLong(TODAY), time: '21:30' })}
          </span>
        </div>

        {closed === null ? (
          <>
            <Stepper steps={steps} current={step} onStepClick={(i) => setStep(i as 0 | 1 | 2)} />

            {step === 0 ? (
              <section key="step-1" className={STEP_SECTION + ' gap-5'}>
                <div className="flex flex-col gap-2">
                  <h3 className="font-display text-display-lg">{t('ritual.step1.title')}</h3>
                  <p className="text-pretty text-ink-2">{t('ritual.step1.body')}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {reviewable.map((task) => (
                    <ReviewRow
                      key={task.id}
                      task={task}
                      decision={decisions[task.id]}
                      onToggleDone={() => onToggleDone(task)}
                      onDecide={(decision) => onDecide(task, decision)}
                    />
                  ))}
                </div>
                <RitualFooter
                  status={{ remaining }}
                  primaryLabel={t('ritual.step1.cta')}
                  disabled={remaining > 0}
                  onNext={() => setStep(1)}
                  onBlockedClick={() => showToast('ritual.step1.blocked')}
                />
              </section>
            ) : null}

            {step === 1 ? (
              <section key="step-2" className={STEP_SECTION + ' gap-[22px]'}>
                <div className="flex flex-col gap-2">
                  <h3 className="font-display text-display-lg">{t('ritual.step2.title')}</h3>
                  <p className="text-ink-2">{t('ritual.step2.body')}</p>
                </div>
                <ReflectionForm value={reflection} onChange={setReflection} />
                <RitualFooter
                  primaryLabel={t(reflectionTouched ? 'ritual.step2.cta' : 'ritual.step2.ctaEmpty')}
                  onNext={() => setStep(2)}
                  onBack={() => setStep(0)}
                />
              </section>
            ) : null}

            {step === 2 ? (
              <section key="step-3" className={STEP_SECTION + ' gap-5'}>
                <div className="flex flex-col gap-2">
                  <h3 className="font-display text-display-lg">
                    {t('ritual.step3.title', { tomorrow: formatDateLong(TOMORROW) })}
                  </h3>
                  <p className="text-pretty text-ink-2">
                    {t('ritual.step3.body', { lockAt: DEFAULT_SETTINGS.lockTime })}
                  </p>
                </div>
                <TomorrowPlanList
                  items={items}
                  onToggleMit={onToggleMit}
                  onRemove={(id) => setAdded((current) => current.filter((i) => i.id !== id))}
                  onAdd={(parsed) =>
                    setAdded((current) => [...current, { id: `new${current.length + 1}`, parsed }])
                  }
                />
                <RitualFooter
                  primaryLabel={t('ritual.step3.cta')}
                  onNext={finish}
                  onBack={() => setStep(1)}
                />
              </section>
            ) : null}
          </>
        ) : (
          <RitualSummary
            date={TODAY}
            pct={closed.pct}
            done={closed.done}
            total={closed.total}
            adhocDone={closed.adhocDone}
            moved={closed.moved}
            dropped={closed.dropped}
            energy={closed.dayLog.energy}
            good={closed.dayLog.good}
            tomorrow={{ count: closed.tomorrowCount, mitTitles: closed.tomorrowMitTitles }}
            consistencyPlanned={consistency(statsDays(26), TODAY).planned}
            onDone={reset}
          />
        )}

        <button
          type="button"
          onClick={reset}
          className="self-start rounded-pill border-[1.5px] border-line px-4 py-2 text-caption text-ink-2 hover:bg-hover"
        >
          Reset fixtures
        </button>
      </div>
    </ClockProvider>
  );
}
