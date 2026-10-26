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
      <PageTitle title="Revision plan" sub="Today’s minutes go where they help most: weak topics with the most marks, and topics that show up often in past papers." />
      <form onSubmit={save} className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-line bg-surface p-4">
        <div><label htmlFor="mins" className="mb-1 block text-sm font-semibold">Minutes per day</label>
          <input id="mins" type="number" min={10} max={720} step={5} className={`${field} w-32`} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></div>
        <div><label htmlFor="exam" className="mb-1 block text-sm font-semibold">Exam date</label>
          <input id="exam" type="date" className={`${field} w-44`} value={exam} onChange={(e) => setExam(e.target.value)} /></div>
        <button className={btn}>Update plan</button>
        {msg && <p className="text-sm text-muted" role="status">{msg}</p>}
      </form>

      {!data ? <p className="text-muted">Building your plan…</p> : !data.topics.length
        ? <Empty title="No topics yet" body="Upload a syllabus and the plan will be built from it." href="/materials" cta="Upload materials" />
        : (
          <>
            {plan!.daysLeft !== null && (
              <p className="mb-4 text-lg"><strong>{plan!.daysLeft} days</strong> left, about <strong>{Math.round((plan!.totalMinutes ?? 0) / 60)} hours</strong> of revision at this pace.</p>
            )}
            {data.totals.attempts === 0 && <p className="mb-4 rounded-md border border-brand/30 bg-brand/5 p-3">This plan is a first guess based on syllabus weights. <Link href="/quiz" className="font-semibold text-brand underline">Take the diagnostic quiz</Link> to make it personal.</p>}
            <ol className="space-y-3">
              {plan!.items.map((it) => (
                <li key={it.topicId} className="rounded-lg border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3"><h2 className="text-lg font-bold">{it.name}</h2><Badge rating={it.rating} /></div>
                    <p className="text-2xl font-bold">{it.minutes}<span className="text-sm font-normal text-muted"> min today</span></p>
                  </div>
                  <div className="my-2 h-2 rounded bg-paper" role="img" aria-label={`${it.minutes} of ${subject.daily_minutes} minutes`}><div className="h-2 rounded bg-brand" style={{ width: `${(it.minutes / subject.daily_minutes) * 100}%` }} /></div>
                  <p className="text-sm text-muted">Mastery {pct(it.mastery)}. {it.action}</p>
                  {(data.revise[it.topicId] ?? []).length > 0 && (
                    <p className="read mt-1 text-sm">Revise: {(data.revise[it.topicId]).map((r) => r.heading || r.title).join('; ')}</p>
                  )}
                </li>
              ))}
            </ol>
            {plan!.maintenance.length > 0 && (
              <p className="mt-5 text-sm text-muted">Not scheduled today: {plan!.maintenance.map((m) => m.name).join(', ')}. They are strong enough, or too low priority for your time budget. They return to the plan if your results change.</p>
            )}
            <details className="mt-6 text-sm text-muted"><summary className="cursor-pointer font-semibold text-ink">How this plan is calculated</summary>
              <p className="mt-2 max-w-prose">Priority = (1 − mastery) × syllabus weight × (1 + 0.5 × how often the topic appears in your past papers). Topics you have not been tested on count as 50% mastered. Your daily minutes are split in proportion to priority, and any block under 10 minutes is dropped. It is recalculated after every answer.</p></details>
          </>
        )}
    </>
  );
}
