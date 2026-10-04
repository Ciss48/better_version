import { PageContainer } from '@/components/app-shell/PageContainer';
import { t } from '@/lib/copy';

export default function StatsPage() {
  return (
    <PageContainer>
      <p className="text-label font-semibold uppercase text-ink-3">{t('stats.kicker')}</p>
      <h1 className="mt-3 text-display-md app:text-display-xl">{t('nav.stats')}</h1>
    </PageContainer>
  );
}
