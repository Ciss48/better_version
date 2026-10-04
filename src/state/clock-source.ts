'use client';

import { useEffect, useState } from 'react';

/**
 * The one place in the app that reads the wall clock. Everything else takes
 * `now` as a value — the domain by contract, components through `useClock()`.
 *
 * In development a `?now=<ISO instant>` param **freezes** the clock for the
 * session, which is how every screen state in design/handoff/screens.md is
 * reproduced for screenshots and e2e. In production the override does not
 * exist: `IS_DEV` is a compile-time constant, so the branch and the
 * sessionStorage access are removed from the bundle.
 */

const IS_DEV = process.env.NODE_ENV !== 'production';
const SESSION_KEY = 'bed:v1:nowOverride';
const DEFAULT_INTERVAL_MS = 30_000;

let override: Date | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** `true` once a dev override is in place — the clock no longer ticks. */
export function isNowFrozen(): boolean {
  return override !== null;
}

export function getNow(): Date {
  return override === null ? new Date() : new Date(override.getTime());
}

/**
 * Freezes the clock at `d`, or lets it run again with `null`. Dev only; kept in
 * `sessionStorage` so client-side navigation and reloads keep the same instant.
 */
export function setNowOverride(d: Date | null): void {
  if (!IS_DEV) return;
  override = d;
  if (typeof window !== 'undefined') {
    if (d === null) window.sessionStorage.removeItem(SESSION_KEY);
    else window.sessionStorage.setItem(SESSION_KEY, d.toISOString());
  }
  notify();
}

/** Restores an override written by an earlier page of the same session. */
export function restoreNowOverride(): void {
  if (!IS_DEV || typeof window === 'undefined' || override !== null) return;
  const stored = window.sessionStorage.getItem(SESSION_KEY);
  if (stored === null) return;
  const parsed = new Date(stored);
  if (Number.isNaN(parsed.getTime())) {
    window.sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  override = parsed;
  notify();
}

/**
 * `now`, re-rendering every `intervalMs` (30s by default) so the kicker time,
 * the plan countdown and the banner thresholds keep up with the real clock.
 * Under a dev override the value never changes.
 */
export function useNow(intervalMs: number = DEFAULT_INTERVAL_MS): Date {
  const [now, setNow] = useState(getNow);

  useEffect(() => {
    const sync = () => setNow(getNow());
    // The override may have been restored after this component first rendered.
    sync();
    listeners.add(sync);
    const timer = window.setInterval(() => {
      if (override === null) sync();
    }, intervalMs);
    return () => {
      listeners.delete(sync);
      window.clearInterval(timer);
    };
  }, [intervalMs]);

  return now;
}
