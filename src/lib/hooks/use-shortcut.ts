'use client';

import { useEffect, useRef } from 'react';

const TYPING_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];

/** True when the event came from somewhere the user is typing. */
function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (element === null) return false;
  return element.isContentEditable || TYPING_TAGS.includes(element.tagName);
}

/**
 * Registers a global single-key shortcut. Events from inputs, textareas,
 * selects and contenteditable elements are ignored, as are events carrying
 * Ctrl, Meta or Alt — every app shortcut is a bare key.
 */
export function useShortcut(
  key: string | string[],
  handler: (event: KeyboardEvent) => void,
  opts?: { enabled?: boolean },
): void {
  const enabled = opts?.enabled ?? true;
  const handlerRef = useRef(handler);
  // Kept out of the listener's deps so a fresh inline handler each render does
  // not tear down and re-add the listener.
  useEffect(() => {
    handlerRef.current = handler;
  });

  // Serialised so an inline array literal does not re-register the listener on
  // every render. JSON keeps keys such as a space or a comma unambiguous.
  const keys = JSON.stringify((Array.isArray(key) ? key : [key]).map((k) => k.toLowerCase()));

  useEffect(() => {
    if (!enabled) return;
    const wanted = JSON.parse(keys) as string[];

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!wanted.includes(event.key.toLowerCase())) return;
      if (isTyping(event.target)) return;
      handlerRef.current(event);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, keys]);
}
