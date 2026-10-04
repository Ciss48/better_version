import { cn } from '@/lib/utils';

export interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/** One settings card: a `surface` panel with a display title and a lead-in. */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section className={cn('flex flex-col gap-4 rounded-panel bg-surface p-[22px]', className)}>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-[20px]">{title}</h2>
        {description === undefined ? null : (
          <p className="text-pretty text-body-sm text-ink-2">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
