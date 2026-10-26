'use client';
import Link from 'next/link';
import { useState } from 'react';
import GapMap from '@/components/GapMap';
import { useWorkspace } from '@/components/Shell';
import { Badge, btn, btnGhost, Empty, ErrorNote, PageTitle, pct, useDiagnosis } from '@/components/ui';

export default function GapReport() {
  const { subject } = useWorkspace();
  const { data, error } = useDiagnosis(subject.id);
  const [sel, setSel] = useState<string | null>(null);

  if (error) return <ErrorNote message={error} />;
  if (!data) return <p className="text-muted">Reading your results…</p>;
  if (!data.topics.length)
    return (<><PageTitle title="Gap report" /><Empty title="Start with your syllabus" body="The syllabus becomes your topic map. Upload it, then add notes and past papers." href="/materials" cta="Upload materials" /></>);

  const weights = Object.fromEntries(data.topics.map((t) => [t.id, t.weight]));
  const count = (r: string) => data.gaps.filter((g) => g.rating === r).length;
  const active = data.gaps.find((g) => g.topicId === (sel ?? data.plan.items[0]?.topicId ?? data.gaps[0].topicId))!;
  const topic = data.topics.find((t) => t.id === active.topicId)!;
  const revise = data.revise[active.topicId] ?? [];

  return (
    <>
      <PageTitle title="Gap report" sub={`Where you stand in ${subject.name}, topic by topic. Bigger tiles carry more marks.`} />

      <dl className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[['Overall', pct(data.overall.mastery)], ['Weak', count('weak')], ['Medium', count('medium')], ['Strong', count('strong')],
          [data.plan.daysLeft === null ? 'Questions answered' : 'Days to exam', data.plan.daysLeft === null ? data.totals.attempts : data.plan.daysLeft]].map(([k, v]) => (
          <div key={String(k)} className="rounded-md border border-line bg-surface p-3">
            <dt className="text-sm text-muted">{k}</dt><dd className="text-2xl font-bold">{v}</dd>
          </div>
        ))}
      </dl>

      {data.totals.attempts === 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-brand/30 bg-brand/5 p-4">
          <p><strong>Nothing is rated yet.</strong> A short diagnostic quiz from your notes will fill in this map.</p>
          <Link href="/quiz" className={btn}>Take the diagnostic quiz</Link>
        </div>
      )}

      <GapMap gaps={data.gaps} weights={weights} selected={active.topicId} onSelect={setSel} />

      <section className="mt-6 rounded-lg border border-line bg-surface p-5" aria-live="polite">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold">{active.name}</h2><Badge rating={active.rating} />
        </div>
        <p className="mt-2"><span className="font-semibold">Why this rating: </span>{active.reason}</p>
        {topic.description && <p className="read mt-2 max-w-prose text-muted">{topic.description}</p>}
        {topic.chunkCount === 0 && <p className="mt-2 text-sm text-weak">None of your notes matched this topic yet, so it cannot be quizzed. Upload notes that cover it.</p>}
        {revise.length > 0 && active.rating !== 'strong' && (
          <div className="mt-3">
            <p className="font-semibold">Where your mistakes came from</p>
            <ul className="read mt-1 list-disc pl-5">
              {revise.map((r, i) => <li key={i}>{r.heading || r.title}{r.page ? `, p.${r.page}` : ''} <span className="text-muted">({r.title}, {r.count} missed)</span></li>)}
            </ul>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/quiz?topic=${active.topicId}`} className={btn}>Practise this topic</Link>
          <Link href={`/ask?topic=${active.topicId}`} className={btnGhost}>Explain this topic from my notes</Link>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted">
        {[['bg-weak', 'Weak: under 40%'], ['bg-medium', 'Medium: 40–75%'], ['bg-strong', 'Strong: 75% or more'], ['hatch border border-line', 'Needs 3 answers to rate']].map(([c, l]) => (
          <span key={l} className="flex items-center gap-2"><i className={`inline-block h-3 w-5 rounded-sm ${c}`} />{l}</span>
        ))}
      </div>
      <p className="mt-4"><Link href="/plan" className="font-semibold text-brand underline">See today’s revision plan</Link></p>
    </>
  );
}
