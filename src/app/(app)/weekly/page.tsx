import { PageContainer } from '@/components/app-shell/PageContainer';
import { t } from '@/lib/copy';

export default function WeeklyPage() {
  return (
    <PageContainer>
      <p className="text-label font-semibold uppercase text-ink-3">{t('phase2.weekly.kicker')}</p>
      <h1 className="mt-3 text-display-md app:text-display-xl">{t('nav.weekly')}</h1>
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-card border-2 border-dashed border-accent p-5">
        <span className="rounded-pill bg-accent px-2.5 py-1 text-micro font-semibold text-on-accent">
          {t('phase2.tag')}
        </span>
        <p className="min-w-0 flex-1 text-body-sm text-ink-2">{t('phase2.notice')}</p>
      </div>
    </PageContainer>
  );
}
