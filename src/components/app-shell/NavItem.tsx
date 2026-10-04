import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
  tag?: string;
}

/** A 42px sidebar pill. Active = paper fill + weight 600. */
export function NavItem({ href, icon: Icon, label, active, tag }: NavItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-[42px] items-center gap-3 rounded-pill px-3.5 text-[14.5px] transition-colors',
        active ? 'bg-paper font-semibold text-ink' : 'font-medium text-ink hover:bg-hover',
      )}
    >
      <Icon size={18} strokeWidth={2.75} className="shrink-0" aria-hidden />
      <span className="flex-1 truncate">{label}</span>
      {tag ? (
        <span className="rounded-pill bg-line-2 px-2 py-0.5 text-[10.5px] font-semibold text-ink-3">
          {tag}
        </span>
      ) : null}
    </Link>
  );
}
