import type { Ctx, ISODate, TaskEvent, TaskEventType } from './types';

export function makeEvent(
  type: TaskEventType,
  taskId: string | null,
  planDate: ISODate,
  payload: Record<string, unknown>,
  ctx: Ctx,
): TaskEvent {
  return {
    id: ctx.newId(),
    type,
    taskId,
    planDate,
    occurredAt: ctx.now.toISOString(),
    payload,
  };
}
