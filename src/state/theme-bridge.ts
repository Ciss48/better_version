import type { Theme } from '@/domain';

/**
 * next-themes only exposes `setTheme` through a hook, and the store is not a
 * component. `ClockBridge` registers the setter once; `updateSettings` calls
 * `applyTheme` so a theme saved in settings also switches the live `.dark`
 * class. Without a registered setter (tests, SSR) this is a no-op.
 */

let setter: ((theme: Theme) => void) | null = null;

export function registerThemeSetter(fn: ((theme: Theme) => void) | null): void {
  setter = fn;
}

export function applyTheme(theme: Theme): void {
  setter?.(theme);
}
