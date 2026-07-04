'use client';

import { usePathname } from 'next/navigation';

export default function FeedbackButton() {
  const pathname = usePathname();
  const href = `https://form.typeform.com/to/K6PJG0k8?page=${encodeURIComponent(pathname)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm font-medium text-[var(--ink)] shadow-md transition-colors hover:bg-[var(--sage-light)] hover:border-[var(--sage-mid)] no-underline"
    >
      💬 Signaler un bug / une idée
    </a>
  );
}
