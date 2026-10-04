import { describe, expect, it } from 'vitest';

import { completion, flagsForQuadrant, quadrantOf, taskWeight } from '../weights';
import type { Quadrant } from '../types';
import { task } from './helpers';

describe('taskWeight', () => {
  it('weighs S1 · M2 · L3 with null falling back to M', () => {
    expect(taskWeight(task({ size: 'S' }))).toBe(1);
    expect(taskWeight(task({ size: 'M' }))).toBe(2);
    expect(taskWeight(task({ size: 'L' }))).toBe(3);
    expect(taskWeight(task({ size: null }))).toBe(2);
  });

  it('doubles a MIT', () => {
    expect(taskWeight(task({ size: 'S', mit: true }))).toBe(2);
    expect(taskWeight(task({ size: 'L', mit: true }))).toBe(6);
    expect(taskWeight(task({ size: null, mit: true }))).toBe(4);
  });
});

describe('completion', () => {
  it('weighs the planned, non-dropped tasks of a mixed day', () => {
    const tasks = [
      task({ size: 'L', mit: true, status: 'done' }),
      task({ size: 'M', status: 'todo' }),
      task({ size: 'S', status: 'done' }),
      task({ size: null, status: 'moved', movedTo: '2026-10-04' }),
      task({ size: 'L', status: 'dropped' }),
      task({ size: 'S', status: 'done', adhoc: true }),
    ];
    expect(completion(tasks)).toEqual({ pct: 64, done: 2, total: 4 });
  });

  it('returns zeroes for an empty day', () => {
    expect(completion([])).toEqual({ pct: 0, done: 0, total: 0 });
  });

  it('returns zeroes when the day only has adhoc tasks', () => {
    expect(
      completion([task({ adhoc: true, status: 'done' }), task({ adhoc: true, status: 'todo' })]),
    ).toEqual({ pct: 0, done: 0, total: 0 });
  });

  it('returns zeroes when every planned task was dropped', () => {
    expect(completion([task({ status: 'dropped' })])).toEqual({ pct: 0, done: 0, total: 0 });
  });

  it('counts a moved task as not done', () => {
    expect(
      completion([
        task({ size: 'M', status: 'done' }),
        task({ size: 'M', status: 'moved', movedTo: '2026-10-04' }),
      ]),
    ).toEqual({ pct: 50, done: 1, total: 2 });
  });

  it('reaches 100 when every considered task is done', () => {
    expect(
      completion([task({ status: 'done' }), task({ status: 'done', adhoc: true })]),
    ).toEqual({ pct: 100, done: 1, total: 1 });
  });
});

describe('quadrantOf / flagsForQuadrant', () => {
  it('maps flags to quadrants', () => {
    expect(quadrantOf({ important: true, urgent: true })).toBe('q1');
    expect(quadrantOf({ important: true, urgent: false })).toBe('q2');
    expect(quadrantOf({ important: false, urgent: true })).toBe('q3');
    expect(quadrantOf({ important: false, urgent: false })).toBe('q4');
  });

  it('round-trips every quadrant', () => {
    const quadrants: Quadrant[] = ['q1', 'q2', 'q3', 'q4'];
    for (const q of quadrants) {
      expect(quadrantOf(flagsForQuadrant(q))).toBe(q);
    }
  });
});
