'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useWorkspace } from '@/components/Shell';
import { Badge, btn, Empty, ErrorNote, field, PageTitle, pct, useDiagnosis } from '@/components/ui';
import { supabase } from '@/lib/client';

export default function Plan() {
  const { subject, reload } = useWorkspace();
  const { data, error, reload: refresh } = useDiagnosis(subject.id);
  const [minutes, setMinutes] = useState(subject.daily_minutes);
  const [exam, setExam] = useState(subject.exam_date ?? '');
  const [msg, setMsg] = useState('');
  useEffect(() => { setMinutes(subject.daily_minutes); setExam(subject.exam_date ?? ''); }, [subject]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error: err } = await supabase().from('subjects').update({ daily_minutes: minutes, exam_date: exam || null }).eq('id', subject.id);
    setMsg(err ? err.message : 'Saved. Your plan has been recalculated.');
    await reload(); await refresh();
  }

  if (error) return <ErrorNote message={error} />;
  const plan = data?.plan;
  return (
    <>
      <PageTitle title="Revision plan" sub="Today's minutes go where they help most: weak topics with the most marks, and topics that show up often in past papers." />

      {/* Settings Card */}
      <form onSubmit={save} className="mb-8 glass-card rounded-2xl p-6 animate-in">
        <div className="mb-4 flex items-center gap-2">
          <svg className="h-5 w-5 text-brand-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>
          <h2 className="font-semibold">Study Settings</h2>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="mins" className="mb-1.5 block text-sm font-medium text-muted">Minutes per day</label>
            <input id="mins" type="number" min={10} max={720} step={5} className={`${field} w-32`} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
          </div>
          <div>
            <label htmlFor="exam" className="mb-1.5 block text-sm font-medium text-muted">Exam date</label>
            <input id="exam" type="date" className={`${field} w-44`} value={exam} onChange={(e) => setExam(e.target.value)} />
          </div>
          <button className={btn}>Update plan</button>
          {msg && <p className="text-sm text-brand-light" role="status">✓ {msg}</p>}
        </div>
      </form>

      {!data ? (
        <div className="flex items-center gap-3 text-muted">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" />
          Building your plan…
        </div>
      ) : !data.topics.length ? (
        <Empty title="No topics yet" body="Upload a syllabus and the plan will be built from it." href="/materials" cta="Upload materials" />
      ) : (
        <div className="animate-in animate-in-delay">
          {plan!.daysLeft !== null && (
            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-brand/20 bg-brand/5 p-4">
              <svg className="h-5 w-5 text-brand-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-lg"><strong className="text-brand-light">{plan!.daysLeft} days</strong> left, about <strong className="text-brand-light">{Math.round((plan!.totalMinutes ?? 0) / 60)} hours</strong> of revision at this pace.</p>
            </div>
          )}

          {data.totals.attempts === 0 && (
            <div className="mb-6 rounded-xl border border-brand/20 bg-brand/5 p-4">
              <p>This plan is a first guess based on syllabus weights. <Link href="/quiz" className="font-semibold text-brand-light underline">Take the diagnostic quiz</Link> to make it personal.</p>
            </div>
          )}

          <ol className="space-y-3">
            {plan!.items.map((it, idx) => (
              <li key={it.topicId} className="stat-card glass-card rounded-xl p-5 animate-in" style={{ animationDelay: `${idx * 60}ms` }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15 text-sm font-bold text-brand-light">{idx + 1}</div>
                    <h2 className="text-lg font-bold">{it.name}</h2>
                    <Badge rating={it.rating} />
                  </div>
                  <p className="text-2xl font-bold text-brand-light">{it.minutes}<span className="ml-1 text-sm font-normal text-muted">min today</span></p>
                </div>
                <div className="my-3 h-2 overflow-hidden rounded-full bg-line" role="img" aria-label={`${it.minutes} of ${subject.daily_minutes} minutes`}>
                  <div className="h-full rounded-full bg-gradient-brand progress-fill" style={{ width: `${(it.minutes / subject.daily_minutes) * 100}%` }} />
                </div>
                <p className="text-sm text-muted">Mastery {pct(it.mastery)}. {it.action}</p>
                {(data.revise[it.topicId] ?? []).length > 0 && (
                  <p className="read mt-2 text-sm text-muted/80">📖 Revise: {(data.revise[it.topicId]).map((r) => r.heading || r.title).join('; ')}</p>
                )}
              </li>
            ))}
          </ol>

          {plan!.maintenance.length > 0 && (
            <p className="mt-6 rounded-xl border border-line bg-surface/30 p-4 text-sm text-muted">
              <span className="font-semibold text-ink">Not scheduled today:</span> {plan!.maintenance.map((m) => m.name).join(', ')}. They are strong enough, or too low priority for your time budget.
            </p>
          )}

          <details className="mt-6 text-sm text-muted">
            <summary className="cursor-pointer font-semibold text-ink transition-colors hover:text-brand-light">ℹ️ How this plan is calculated</summary>
            <p className="mt-3 max-w-prose leading-relaxed rounded-xl bg-surface/30 p-4">Priority = (1 − mastery) × syllabus weight × (1 + 0.5 × how often the topic appears in your past papers). Topics you have not been tested on count as 50% mastered. Your daily minutes are split in proportion to priority, and any block under 10 minutes is dropped. It is recalculated after every answer.</p>
          </details>
        </div>
      )}
    </>
  );
}
