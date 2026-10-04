'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useId, useState } from 'react';
import { quadrantOf } from '@/domain';
import type { Quadrant, Task } from '@/domain';
import { t } from '@/lib/copy';
import { cn } from '@/lib/utils';
import { MatrixBottomSheet } from './MatrixBottomSheet';
import { MatrixQuadrant } from './MatrixQuadrant';

export interface MatrixBoardProps {
  /** Only `todo` and `done` tasks appear on the board. */
  tasks: Task[];
  interaction: 'drag' | 'tap';
  onSetQuadrant(taskId: string, q: Quadrant): void;
  onToggleDone(taskId: string): void;
  className?: string;
}

const QUADRANTS: Quadrant[] = ['q1', 'q2', 'q3', 'q4'];

function isQuadrant(value: unknown): value is Quadrant {
  return typeof value === 'string' && (QUADRANTS as string[]).includes(value);
}

/**
 * The Eisenhower board. Owns the dnd-kit context (pointer + keyboard) on
 * desktop and, in tap mode, the bottom sheet that replaces dragging.
 */
export function MatrixBoard({
  tasks,
  interaction,
  onSetQuadrant,
  onToggleDone,
  className,
}: MatrixBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overQuadrant, setOverQuadrant] = useState<Quadrant | null>(null);
  const [sheetTaskId, setSheetTaskId] = useState<string | null>(null);
  // dnd-kit derives its aria-describedby id from a module-level counter, which
  // drifts between the server and client renders; an explicit id pins it.
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const visible = tasks.filter((task) => task.status === 'todo' || task.status === 'done');
  const sheetTask = visible.find((task) => task.id === sheetTaskId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const over = event.over?.id;
    const taskId = String(event.active.id);
    setDraggingId(null);
    setOverQuadrant(null);
    if (!isQuadrant(over)) return;
    const task = visible.find((candidate) => candidate.id === taskId);
    if (task === undefined || quadrantOf(task) === over) return;
    onSetQuadrant(taskId, over);
  }

  const board = (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <p className="text-caption text-ink-3">
        {interaction === 'drag' ? t('today.matrix.hintDesktop') : t('today.matrix.hintMobile')}
      </p>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        {QUADRANTS.map((quadrant) => (
          <MatrixQuadrant
            key={quadrant}
            quadrant={quadrant}
            tasks={visible.filter((task) => quadrantOf(task) === quadrant)}
            isDropTarget={overQuadrant === quadrant}
            interaction={interaction}
            draggingId={draggingId}
            onTapTask={setSheetTaskId}
            onToggleDone={onToggleDone}
          />
        ))}
      </div>
    </div>
  );

  if (interaction === 'tap') {
    return (
      <>
        {board}
        <MatrixBottomSheet
          open={sheetTask !== null}
          task={sheetTask}
          onSelect={(quadrant) => {
            if (sheetTask !== null) onSetQuadrant(sheetTask.id, quadrant);
            setSheetTaskId(null);
          }}
          onClose={() => setSheetTaskId(null)}
        />
      </>
    );
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      accessibility={{
        screenReaderInstructions: { draggable: t('today.matrix.dragInstructions') },
      }}
      onDragStart={handleDragStart}
      onDragOver={(event) => {
        const over = event.over?.id;
        setOverQuadrant(isQuadrant(over) ? over : null);
      }}
      onDragCancel={() => {
        setDraggingId(null);
        setOverQuadrant(null);
      }}
      onDragEnd={handleDragEnd}
    >
      {board}
    </DndContext>
  );
}
