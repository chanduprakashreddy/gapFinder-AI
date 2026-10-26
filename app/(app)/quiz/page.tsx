'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useWorkspace } from '@/components/Shell';
import { btn, btnGhost, ErrorNote, PageTitle } from '@/components/ui';
import { api } from '@/lib/client';
import type { QuizQuestion } from '@/lib/types';

type Verdict = { correct: boolean; correctIndex: number; explanation: string; evidence: string; citation: { title: string; heading: string; page: number | null } };
type Stage = 'idle' | 'loading' | 'asking' | 'done';

export default function Quiz() {
  const { subject } = useWorkspace();
  const [stage, setStage] = useState<Stage>('idle');
  const [qs, setQs] = useState<QuizQuestion[]>([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [log, setLog] = useState<{ topic: string; correct: boolean }[]>([]);
  const [skipped, setSkipped] = useState<{ topic: string; reason: string }[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function start() {
    setStage('loading'); setErr(''); setLog([]); setI(0); setPicked(null); setVerdict(null);
    const topic = new URLSearchParams(window.location.search).get('topic');
    try {
      const r = await api<{ questions: QuizQuestion[]; skipped: { topic: string; reason: string }[] }>('/api/quiz', {
        method: 'POST', body: JSON.stringify({ subjectId: subject.id, count: topic ? 6 : 15, topicIds: topic ? [topic] : undefined }),
      });
      setQs(r.questions); setSkipped(r.skipped); setStage('asking');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not build the quiz.'); setStage('idle'); }
  }

  async function answer(idx: number) {
    if (verdict || busy) return;
    setPicked(idx); setBusy(true); setErr('');
    try {
      const v = await api<Verdict>('/api/evaluate', { method: 'POST', body: JSON.stringify({ questionId: qs[i].id, selectedIndex: idx }) });
      setVerdict(v); setLog((l) => [...l, { topic: qs[i].topicName, correct: v.correct }]);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not check that answer.'); setPicked(null); }
    setBusy(false);
  }

  function next() {
    if (i + 1 >= qs.length) return setStage('done');
    setI(i + 1); setPicked(null); setVerdict(null);
  }

  if (stage === 'idle' || stage === 'loading')
    return (
      <>
        <PageTitle title="Diagnostic quiz" sub="15 questions written from your own notes. We start with the topics that matter most and that you are least likely to know. Every question cites its source." />
        {err && <div className="mb-4"><ErrorNote message={err} /></div>}
        <button className={btn} onClick={start} disabled={stage === 'loading'}>{stage === 'loading' ? 'Reading your notes and writing questions…' : 'Start quiz'}</button>
        {stage === 'loading' && <p className="mt-3 text-sm text-muted">This takes 10–20 seconds. Questions that don’t trace back to your material are thrown away.</p>}
      </>
    );

  if (stage === 'done') {
    const byTopic = new Map<string, [number, number]>();
    log.forEach((l) => { const [c, n] = byTopic.get(l.topic) ?? [0, 0]; byTopic.set(l.topic, [c + (l.correct ? 1 : 0), n + 1]); });
    const total = log.filter((l) => l.correct).length;
    return (
      <>
        <PageTitle title={`${total} of ${log.length} correct`} sub="Your gap report and plan have been updated with these answers." />
        <ul className="mb-6 divide-y divide-line rounded-lg border border-line bg-surface">
          {[...byTopic].map(([t, [c, n]]) => <li key={t} className="flex justify-between p-3"><span>{t}</span><span className="font-semibold">{c}/{n}</span></li>)}
        </ul>
        {skipped.length > 0 && <p className="mb-4 text-sm text-muted">Skipped: {skipped.map((s) => s.topic).join(', ')} (no matching notes).</p>}
        <div className="flex gap-2"><Link href="/" className={btn}>See your gap report</Link><button className={btnGhost} onClick={start}>Take another quiz</button></div>
      </>
    );
  }

  const q = qs[i];
  return (
    <>
      <p className="mb-2 text-sm text-muted">Question {i + 1} of {qs.length} · {q.topicName}</p>
      <h1 className="read max-w-prose text-2xl font-semibold">{q.question}</h1>
      <p className="mt-1 text-sm text-muted">Source: {q.citation.title}{q.citation.heading ? `, ${q.citation.heading}` : ''}{q.citation.page ? `, p.${q.citation.page}` : ''}</p>
      <div className="mt-5 max-w-2xl space-y-2" role="group" aria-label="Answer options">
        {q.options.map((o, k) => {
          const state = !verdict ? '' : k === verdict.correctIndex ? 'border-strong bg-strong/10' : k === picked ? 'border-weak bg-weak/10' : 'opacity-60';
          return (
            <button key={k} onClick={() => answer(k)} disabled={!!verdict || busy}
              className={`flex w-full gap-3 rounded-md border border-line bg-surface p-3 text-left hover:border-brand ${state}`}>
              <span className="font-bold">{String.fromCharCode(65 + k)}</span><span className="read">{o}</span>
            </button>
          );
        })}
      </div>
      {err && <div className="mt-3"><ErrorNote message={err} /></div>}
      {verdict && (
        <section className="mt-5 max-w-2xl rounded-lg border border-line bg-surface p-4" aria-live="polite">
          <p className="font-bold">{verdict.correct ? 'Correct.' : `Not quite. The answer is ${String.fromCharCode(65 + verdict.correctIndex)}.`}</p>
          <p className="read mt-1">{verdict.explanation}</p>
          <p className="read mt-2 border-l-4 border-brand pl-3 text-muted">“{verdict.evidence}”<br /><span className="font-sans text-xs">{verdict.citation.title}{verdict.citation.heading ? `, ${verdict.citation.heading}` : ''}</span></p>
          <button className={`${btn} mt-4`} onClick={next}>{i + 1 >= qs.length ? 'Finish quiz' : 'Next question'}</button>
        </section>
      )}
    </>
  );
}
