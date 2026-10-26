'use client';
import { useWorkspace } from '@/components/Shell';
import { Empty, ErrorNote, PageTitle, pct, useDiagnosis } from '@/components/ui';

export default function Progress() {
  const { subject } = useWorkspace();
  const { data, error } = useDiagnosis(subject.id);
  if (error) return <ErrorNote message={error} />;
  if (!data) return <p className="text-muted">Loading your progress…</p>;
  const h = data.history;
  if (!h.length)
    return (<><PageTitle title="Progress" /><Empty title="No quiz attempts yet" body="Each quiz adds a point to this chart, and your plan updates as the line moves." href="/quiz" cta="Take the diagnostic quiz" /></>);

  const W = 640, H = 230, P = 36;
  const x = (i: number) => (h.length === 1 ? W / 2 : P + (i * (W - 2 * P)) / (h.length - 1));
  const y = (v: number) => H - P - v * (H - 2 * P);
  const pts = h.map((p, i) => [x(i), y(p.overall ?? 0)] as const);
  const first = h[0], last = h[h.length - 1];
  const delta = (last.overall ?? 0) - (first.overall ?? 0);

  return (
    <>
      <PageTitle title="Progress" sub="Overall mastery after each quiz, weighted by syllabus marks. Each point is the diagnosis as it stood when that quiz ended." />
      <p className="mb-4 text-lg">
        {h.length > 1 ? <>Mastery moved from <strong>{pct(first.overall)}</strong> to <strong>{pct(last.overall)}</strong> over {h.length} quizzes ({delta >= 0 ? '+' : ''}{Math.round(delta * 100)} points).</> : <>First quiz recorded: <strong>{pct(last.overall)}</strong> mastery. Take another to see the trend.</>}
      </p>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[480px]" role="img" aria-label={`Mastery by quiz: ${h.map((p, i) => `quiz ${i + 1} ${pct(p.overall)}`).join(', ')}`}>
          {[[0.4, 'weak below'], [0.75, 'strong above']].map(([v, l]) => (
            <g key={String(v)}><line x1={P} x2={W - P} y1={y(v as number)} y2={y(v as number)} stroke="#D3DCE2" strokeDasharray="4 4" />
              <text x={W - P} y={y(v as number) - 4} textAnchor="end" fontSize="11" fill="#51626F">{Math.round((v as number) * 100)}% {l as string}</text></g>
          ))}
          <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#0F5F66" strokeWidth="3" />
          {pts.map(([px, py], i) => (
            <g key={i}><circle cx={px} cy={py} r="5" fill="#0F5F66" /><text x={px} y={py - 10} textAnchor="middle" fontSize="12" fontWeight="700" fill="#14212B">{pct(h[i].overall)}</text>
              <text x={px} y={H - 10} textAnchor="middle" fontSize="11" fill="#51626F">Quiz {i + 1}</text></g>
          ))}
        </svg>
      </div>

      <h2 className="mb-2 mt-8 text-xl font-bold">By topic</h2>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted"><tr><th className="p-3 font-semibold">Topic</th><th className="p-3 font-semibold">First rated</th><th className="p-3 font-semibold">Now</th><th className="p-3 font-semibold">Change</th></tr></thead>
          <tbody>{data.topics.map((t) => {
            const seq = h.map((p) => p.topics[t.id]).filter((v): v is number => v !== null && v !== undefined);
            const now = seq[seq.length - 1] ?? null, was = seq[0] ?? null;
            const d = now !== null && was !== null ? Math.round((now - was) * 100) : null;
            return (<tr key={t.id} className="border-b border-line last:border-0"><td className="p-3 font-semibold">{t.name}</td><td className="p-3">{pct(was)}</td><td className="p-3">{pct(now)}</td>
              <td className={`p-3 font-semibold ${d === null ? '' : d > 0 ? 'text-strong' : d < 0 ? 'text-weak' : ''}`}>{d === null || seq.length < 2 ? '–' : `${d > 0 ? '+' : ''}${d} pts`}</td></tr>);
          })}</tbody>
        </table>
      </div>

      <h2 className="mb-2 mt-8 text-xl font-bold">Quiz history</h2>
      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {[...h].reverse().map((p, i) => (
          <li key={p.quizId} className="flex justify-between p-3"><span>Quiz {h.length - i} · {new Date(p.at).toLocaleDateString()}</span><span className="font-semibold">{p.correct}/{p.answered} correct</span></li>
        ))}
      </ul>
    </>
  );
}
