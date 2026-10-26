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
  if (!data) return (
    <div className="flex items-center gap-3 py-12 text-muted">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" />
      Reading your results…
    </div>
  );
  if (!data.topics.length)
    return (<><PageTitle title="Gap report" /><Empty title="Start with your syllabus" body="The syllabus becomes your topic map. Upload it, then add notes and past papers." href="/materials" cta="Upload materials" /></>);

  const weights = Object.fromEntries(data.topics.map((t) => [t.id, t.weight]));
  const count = (r: string) => data.gaps.filter((g) => g.rating === r).length;
  const active = data.gaps.find((g) => g.topicId === (sel ?? data.plan.items[0]?.topicId ?? data.gaps[0].topicId))!;
  const topic = data.topics.find((t) => t.id === active.topicId)!;
  const revise = data.revise[active.topicId] ?? [];

  const stats = [
    { label: 'Overall Mastery', value: pct(data.overall.mastery), color: 'from-brand to-brand-light' },
    { label: 'Weak Topics', value: count('weak'), color: 'from-weak to-red-400' },
    { label: 'Medium Topics', value: count('medium'), color: 'from-medium to-yellow-400' },
    { label: 'Strong Topics', value: count('strong'), color: 'from-strong to-emerald-400' },
    { label: data.plan.daysLeft === null ? 'Questions Answered' : 'Days to Exam', value: data.plan.daysLeft === null ? data.totals.attempts : data.plan.daysLeft, color: 'from-blue-500 to-blue-400' },
  ];

  return (
    <>
      <PageTitle title="Gap report" sub={`Where you stand in ${subject.name}, topic by topic. Bigger tiles carry more marks.`} />

      {/* Stat Cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s, i) => (
          <div key={s.label} className="stat-card glass-card rounded-xl p-4 animate-in" style={{ animationDelay: `${i * 80}ms` }}>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted">{s.label}</dt>
            <dd className={`mt-1 text-2xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</dd>
          </div>
        ))}
      </div>

      {/* Quiz CTA */}
      {data.totals.attempts === 0 && (
        <div className="animate-in mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand/20 bg-brand/5 p-5">
          <div>
            <p className="font-semibold text-ink">Nothing is rated yet.</p>
            <p className="mt-1 text-sm text-muted">A short diagnostic quiz from your notes will fill in this map.</p>
          </div>
          <Link href="/quiz" className={btn}>Take the diagnostic quiz</Link>
        </div>
      )}

      {/* Gap Map */}
      <GapMap gaps={data.gaps} weights={weights} selected={active.topicId} onSelect={setSel} />

      {/* Topic Detail Card */}
      <section className="animate-in mt-6 glass-card rounded-2xl p-6" aria-live="polite">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold">{active.name}</h2><Badge rating={active.rating} />
        </div>
        <p className="mt-3 leading-relaxed"><span className="font-semibold text-brand-light">Why this rating: </span>{active.reason}</p>
        {topic.description && <p className="read mt-3 max-w-prose text-muted">{topic.description}</p>}
        {topic.chunkCount === 0 && <p className="mt-3 text-sm text-weak">None of your notes matched this topic yet, so it cannot be quizzed. Upload notes that cover it.</p>}
        {revise.length > 0 && active.rating !== 'strong' && (
          <div className="mt-4">
            <p className="font-semibold">Where your mistakes came from</p>
            <ul className="read mt-2 space-y-1 pl-1">
              {revise.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-weak" />
                  <span>{r.heading || r.title}{r.page ? `, p.${r.page}` : ''} <span className="text-muted">({r.title}, {r.count} missed)</span></span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={`/quiz?topic=${active.topicId}`} className={btn}>Practise this topic</Link>
          <Link href={`/ask?topic=${active.topicId}`} className={btnGhost}>Explain from my notes</Link>
        </div>
      </section>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-muted">
        {[
          { color: 'bg-weak', label: 'Weak: under 40%' },
          { color: 'bg-medium', label: 'Medium: 40–75%' },
          { color: 'bg-strong', label: 'Strong: 75%+' },
          { color: 'hatch border border-line', label: 'Needs 3 answers' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-2"><i className={`inline-block h-3 w-5 rounded ${color}`} />{label}</span>
        ))}
      </div>
      <p className="mt-4"><Link href="/plan" className="font-semibold text-brand-light transition-colors hover:text-brand underline">See today&apos;s revision plan →</Link></p>
    </>
  );
}
