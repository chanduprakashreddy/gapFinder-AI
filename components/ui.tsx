'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import type { Rating } from '@/lib/gap';
import type { Diagnosis } from '@/lib/types';

export const RATING: Record<Rating, { label: string; badge: string }> = {
  weak: { label: 'Weak', badge: 'bg-weak/20 text-weak border border-weak/30' },
  medium: { label: 'Medium', badge: 'bg-medium/20 text-medium border border-medium/30' },
  strong: { label: 'Strong', badge: 'bg-strong/20 text-strong border border-strong/30' },
  untested: { label: 'Not rated yet', badge: 'bg-untested/20 text-muted border border-line' },
};

export function Badge({ rating }: { rating: Rating }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${RATING[rating].badge}`}>{RATING[rating].label}</span>;
}

export const btn = 'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-elevated hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed';
export const btnGhost = 'inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface/50 px-5 py-2.5 text-sm font-semibold text-ink transition-all hover:border-brand/30 hover:bg-surface disabled:opacity-50';
export const field = 'w-full rounded-xl border border-line bg-surface/50 px-4 py-2.5 text-sm text-ink placeholder-muted/50 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20';

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="mb-8 animate-in">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        <span className="bg-gradient-to-r from-ink via-ink to-muted bg-clip-text">{title}</span>
      </h1>
      {sub && <p className="mt-2 max-w-prose text-muted leading-relaxed">{sub}</p>}
    </header>
  );
}

export function Empty({ title, body, href, cta }: { title: string; body: string; href?: string; cta?: string }) {
  return (
    <div className="glass-card rounded-2xl border border-dashed border-line p-10 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
        <svg className="h-8 w-8 text-brand-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-muted">{body}</p>
      {href && cta && <Link href={href} className={`${btn} mt-5`}>{cta}</Link>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-weak/30 bg-weak/10 px-4 py-3">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-weak" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <p className="text-sm text-weak">{message}</p>
    </div>
  );
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
