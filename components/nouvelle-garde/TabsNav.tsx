'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const TABS = [
  { href: '/nouvelle-garde/acteurs',  label: '1. Les acteurs',  sub: 'Qui ?' },
  { href: '/nouvelle-garde/planning', label: '2. Le planning',  sub: 'Quand ?' },
  { href: '/nouvelle-garde/paie',     label: '3. La paie',      sub: 'Combien ?' },
];

export function TabsNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-0 border-b border-[var(--line)]">
      {TABS.map((tab, i) => {
        const active = pathname === tab.href;
        const done   = TABS.findIndex(t => t.href === pathname) > i;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              'flex-1 px-4 py-3 text-center no-underline transition-colors',
              'border-b-2 -mb-px',
              active
                ? 'border-[var(--sage)] text-[var(--sage)]'
                : done
                  ? 'border-transparent text-[var(--dust)] hover:text-[var(--ink)]'
                  : 'border-transparent text-[var(--dust)] hover:text-[var(--ink)]',
            ].join(' ')}
          >
            <div className="text-[11px] font-medium">{tab.sub}</div>
            <div className="text-[13px] font-medium mt-0.5">{tab.label.replace(/^\d+\. /, '')}</div>
          </Link>
        );
      })}
    </div>
  );
}
