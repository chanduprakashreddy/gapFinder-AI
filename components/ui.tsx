'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import type { Rating } from '@/lib/gap';
import type { Diagnosis } from '@/lib/types';

export const RATING: Record<Rating, { label: string; badge: string }> = {
  weak: { label: 'Weak', badge: 'bg-weak text-white' },
  medium: { label: 'Medium', badge: 'bg-medium text-ink' },
  strong: { label: 'Strong', badge: 'bg-strong text-white' },
  untested: { label: 'Not rated yet', badge: 'bg-line text-ink' },
};

export function Badge({ rating }: { rating: Rating }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${RATING[rating].badge}`}>{RATING[rating].label}</span>;
}

export const btn = 'inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-[#0B4C52] disabled:opacity-50 disabled:cursor-not-allowed';
export const btnGhost = 'inline-flex items-center justify-center rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:border-brand disabled:opacity-50';
export const field = 'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm';

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {sub && <p className="mt-1 max-w-prose text-muted">{sub}</p>}
    </header>
  );
}

export function Empty({ title, body, href, cta }: { title: string; body: string; href?: string; cta?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface p-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-muted">{body}</p>
      {href && cta && <Link href={href} className={`${btn} mt-4`}>{cta}</Link>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return <p role="alert" className="rounded-md border border-weak/40 bg-weak/10 px-3 py-2 text-sm text-weak">{message}</p>;
}

export const pct = (m: number | null) => (m === null ? '–' : `${Math.round(m * 100)}%`);

export function useDiagnosis(subjectId: string) {
  const [data, setData] = useState<Diagnosis | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setData(await api<Diagnosis>(`/api/diagnosis?subjectId=${subjectId}`)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load your diagnosis.'); }
  }, [subjectId]);
  useEffect(() => { setData(null); load(); }, [load]);
  return { data, error, reload: load };
}
