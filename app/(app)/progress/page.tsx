'use client';
import { useWorkspace } from '@/components/Shell';
import { Empty, ErrorNote, PageTitle, pct, useDiagnosis } from '@/components/ui';

export default function Progress() {
  const { subject } = useWorkspace();
  const { data, error } = useDiagnosis(subject.id);
  if (error) return <ErrorNote message={error} />;
  if (!data) return (
    <div className="flex items-center gap-3 py-12 text-muted">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" />
      Loading your progress…
    </div>
  );
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

      {/* Summary Card */}
      <div className="mb-8 glass-card rounded-2xl p-6 animate-in">
        <div className="flex items-center gap-2 text-brand-light mb-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4 4L21.75 7.5" /></svg>
          <span className="text-sm font-semibold">Mastery Trend</span>
        </div>
        <p className="text-lg leading-relaxed">
          {h.length > 1 ? <>Mastery moved from <strong className="text-ink">{pct(first.overall)}</strong> to <strong className="text-brand-light">{pct(last.overall)}</strong> over {h.length} quizzes (<span className={delta >= 0 ? 'text-strong' : 'text-weak'}>{delta >= 0 ? '+' : ''}{Math.round(delta * 100)} points</span>).</> : <>First quiz recorded: <strong className="text-brand-light">{pct(last.overall)}</strong> mastery. Take another to see the trend.</>}
        </p>
      </div>

      {/* Chart */}
      <div className="glass-card overflow-x-auto rounded-2xl p-5 animate-in animate-in-delay">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[480px]" role="img" aria-label={`Mastery by quiz: ${h.map((p, i) => `quiz ${i + 1} ${pct(p.overall)}`).join(', ')}`}>
          <defs>
            <linearGradient id="chartLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0f5f66" />
              <stop offset="100%" stopColor="#1a8a7a" />
            </linearGradient>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f5f66" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0f5f66" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid Lines */}
          {[[0.4, 'Weak below'], [0.75, 'Strong above']].map(([v, l]) => (
            <g key={String(v)}>
              <line x1={P} x2={W - P} y1={y(v as number)} y2={y(v as number)} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <text x={W - P} y={y(v as number) - 6} textAnchor="end" fontSize="10" fill="#8494a7">{Math.round((v as number) * 100)}% {l as string}</text>
            </g>
          ))}

          {/* Area Fill */}
          <polygon points={`${pts[0][0]},${H - P} ${pts.map((p) => p.join(',')).join(' ')} ${pts[pts.length - 1][0]},${H - P}`} fill="url(#chartFill)" />

          {/* Line */}
          <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="url(#chartLine)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Points */}
          {pts.map(([px, py], i) => (
            <g key={i}>
              <circle cx={px} cy={py} r="6" fill="#141c25" stroke="url(#chartLine)" strokeWidth="3" />
              <text x={px} y={py - 14} textAnchor="middle" fontSize="11" fontWeight="700" fill="#e2e8f0">{pct(h[i].overall)}</text>
              <text x={px} y={H - 8} textAnchor="middle" fontSize="10" fill="#8494a7">Quiz {i + 1}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* By Topic Table */}
      <h2 className="mb-3 mt-10 flex items-center gap-2 text-xl font-bold">
        <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
        By topic
      </h2>
      <div className="glass-card overflow-x-auto rounded-2xl animate-in animate-in-delay-2">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line">
            <tr>
              <th className="p-4 font-semibold text-muted">Topic</th>
              <th className="p-4 font-semibold text-muted">First rated</th>
              <th className="p-4 font-semibold text-muted">Now</th>
              <th className="p-4 font-semibold text-muted">Change</th>
            </tr>
          </thead>
          <tbody>{data.topics.map((t) => {
            const seq = h.map((p) => p.topics[t.id]).filter((v): v is number => v !== null && v !== undefined);
            const now = seq[seq.length - 1] ?? null, was = seq[0] ?? null;
            const d = now !== null && was !== null ? Math.round((now - was) * 100) : null;
            return (
              <tr key={t.id} className="border-b border-line last:border-0 transition-colors hover:bg-surface-elevated">
                <td className="p-4 font-semibold">{t.name}</td>
                <td className="p-4 text-muted">{pct(was)}</td>
                <td className="p-4">{pct(now)}</td>
                <td className={`p-4 font-semibold ${d === null ? '' : d > 0 ? 'text-strong' : d < 0 ? 'text-weak' : 'text-muted'}`}>
                  {d === null || seq.length < 2 ? '–' : `${d > 0 ? '+' : ''}${d} pts`}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>

      {/* Quiz History */}
      <h2 className="mb-3 mt-10 flex items-center gap-2 text-xl font-bold">
        <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        Quiz history
      </h2>
      <ul className="divide-y divide-line glass-card rounded-2xl">
        {[...h].reverse().map((p, i) => (
          <li key={p.quizId} className="flex items-center justify-between p-4 transition-colors hover:bg-surface-elevated">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-xs font-bold text-brand-light">{h.length - i}</div>
              <div>
                <span className="font-medium">Quiz {h.length - i}</span>
                <span className="ml-2 text-sm text-muted">{new Date(p.at).toLocaleDateString()}</span>
              </div>
            </div>
            <span className="font-bold tabular-nums">{p.correct}/{p.answered} <span className="font-normal text-muted">correct</span></span>
          </li>
        ))}
      </ul>
    </>
  );
}
