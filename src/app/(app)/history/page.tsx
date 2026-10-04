import { PageContainer } from '@/components/app-shell/PageContainer';
import { t } from '@/lib/copy';

export default function HistoryPage() {
  return (
    <PageContainer>
      <p className="text-label font-semibold uppercase text-ink-3">{t('history.kicker')}</p>
      <h1 className="mt-3 text-display-md app:text-display-xl">{t('nav.history')}</h1>
    </PageContainer>
  );
}
