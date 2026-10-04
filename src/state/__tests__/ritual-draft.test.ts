// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDraft, draftKey, emptyDraft, loadDraft, saveDraft } from '../ritual-draft';

const TODAY = '2026-10-03';

beforeEach(() => {
  window.localStorage.clear();
});

describe('ritual draft storage', () => {
  it('starts empty for a day that has none', () => {
    expect(loadDraft(TODAY)).toEqual(emptyDraft(TODAY));
  });

  it('round-trips a draft', () => {
    const draft = {
      ...emptyDraft(TODAY),
      step: 2 as const,
      decisions: { a: { kind: 'drop' as const } },
      reflection: { energy: 4 as const, good: 'Ngủ đủ', improve: '' },
      tomorrowMit: { a: true },
      tomorrowNew: [
        { id: 'n1', parsed: { title: 'Mới', mit: true, important: false, urgent: false, size: null } },
      ],
    };
    saveDraft(draft);
    expect(loadDraft(TODAY)).toEqual(draft);
  });

  it('keys drafts per day', () => {
    saveDraft({ ...emptyDraft(TODAY), step: 1 });
    expect(loadDraft('2026-10-04').step).toBe(0);
    expect(window.localStorage.getItem(draftKey(TODAY))).not.toBeNull();
  });

  it('rejects a draft stored under the wrong date', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.localStorage.setItem(
      draftKey(TODAY),
      JSON.stringify({ ...emptyDraft('2026-09-01'), step: 2 }),
    );
    expect(loadDraft(TODAY)).toEqual(emptyDraft(TODAY));
  });

  it('falls back to a new draft on corrupt JSON and says so', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.localStorage.setItem(draftKey(TODAY), '{nope');
    expect(loadDraft(TODAY)).toEqual(emptyDraft(TODAY));
    expect(spy).toHaveBeenCalled();
  });

  it('reopens a draft left on the summary step at step 3 of the stepper', () => {
    saveDraft({ ...emptyDraft(TODAY), step: 3 });
    expect(loadDraft(TODAY).step).toBe(2);
  });

  it('clearDraft removes only that day', () => {
    saveDraft(emptyDraft(TODAY));
    saveDraft(emptyDraft('2026-10-04'));
    clearDraft(TODAY);
    expect(window.localStorage.getItem(draftKey(TODAY))).toBeNull();
    expect(window.localStorage.getItem(draftKey('2026-10-04'))).not.toBeNull();
  });
});
