import { PageContainer } from '@/components/app-shell/PageContainer';
import { t } from '@/lib/copy';

export default function TodayPage() {
  return (
    <PageContainer width="narrow">
      <p className="text-label font-semibold uppercase text-ink-3">{t('app.tagline')}</p>
      <h1 className="mt-3 text-display-md app:text-display-xl">{t('nav.today')}</h1>
    </PageContainer>
  );
}
