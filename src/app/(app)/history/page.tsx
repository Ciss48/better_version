import { Suspense } from 'react';
import { HistoryScreen } from '@/features/history/HistoryScreen';

/**
 * `HistoryScreen` reads `?date=` / `?month=` with `useSearchParams`, which Next
 * requires a Suspense boundary around. The screen draws its own skeleton once
 * the store is loading, so the fallback here is deliberately nothing.
 */
export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryScreen />
    </Suspense>
  );
}
