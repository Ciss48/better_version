import { afterEach } from 'vitest';

/**
 * DOM setup for the component tests. Every node-environment test file loads
 * this too, so the whole thing is guarded on `document` existing — importing
 * jest-dom or Testing Library in a node environment would blow up.
 *
 * jsdom ships neither matchMedia nor ResizeObserver, which `useIsDesktop` and
 * the Base UI positioners need. matchMedia reports "desktop" so component
 * tests exercise the popover branch unless a test overrides it.
 */
if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');
  const { cleanup } = await import('@testing-library/react');
  afterEach(cleanup);

  if (window.matchMedia === undefined) {
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }

  if (window.ResizeObserver === undefined) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof window.ResizeObserver;
  }

  // Base UI's popups drive their gestures through the pointer-capture APIs.
  if (Element.prototype.setPointerCapture === undefined) {
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
    Element.prototype.hasPointerCapture = () => false;
  }

  if (Element.prototype.scrollIntoView === undefined) {
    Element.prototype.scrollIntoView = () => {};
  }
}
