import { toast } from 'sonner';
import type { Notice } from '@/domain';
import { t } from '@/lib/copy';
import type { CopyKey } from '@/lib/copy';

/** Shows a toast with the Vietnamese copy at `key`. */
export function showToast(key: CopyKey, vars?: Record<string, string | number>): void {
  toast(t(key, vars));
}

/**
 * The copy key for a domain `Notice`. The same notice reads differently
 * depending on what the user just did and which day it applies to.
 */
export function noticeKey(
  n: Notice,
  action: 'add' | 'toggle',
  scope: 'today' | 'tomorrow',
): CopyKey {
  if (n === 'adhocAdded') return 'today.toast.addedAdhoc';
  if (scope === 'tomorrow') {
    return action === 'add' ? 'ritual.step3.mitFullOnAdd' : 'ritual.step3.mitMax';
  }
  return action === 'add' ? 'today.toast.mitFullOnAdd' : 'today.toast.mitMax';
}
