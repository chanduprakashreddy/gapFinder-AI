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
        <button className={btn} onClick={start} disabled={stage === 'loading'}>
          {stage === 'loading' ? (
            <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Reading your notes and writing questions…</>
          ) : '🧠 Start quiz'}
        </button>
        {stage === 'loading' && <p className="mt-3 text-sm text-muted">This takes 10–20 seconds. Questions that don&apos;t trace back to your material are thrown away.</p>}
      </>
    );

  if (stage === 'done') {
    const byTopic = new Map<string, [number, number]>();
    log.forEach((l) => { const [c, n] = byTopic.get(l.topic) ?? [0, 0]; byTopic.set(l.topic, [c + (l.correct ? 1 : 0), n + 1]); });
    const total = log.filter((l) => l.correct).length;
    const pctCorrect = Math.round((total / log.length) * 100);
    return (
      <div className="animate-in">
        <PageTitle title={`${total} of ${log.length} correct`} sub="Your gap report and plan have been updated with these answers." />

        {/* Score Circle */}
        <div className="mb-8 flex items-center gap-6">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="url(#scoreGrad)" strokeWidth="3" strokeDasharray={`${pctCorrect}, 100`} strokeLinecap="round" className="progress-fill" />
              <defs><linearGradient id="scoreGrad"><stop offset="0%" stopColor="#0f5f66" /><stop offset="100%" stopColor="#1a8a7a" /></linearGradient></defs>
            </svg>
            <span className="absolute text-2xl font-bold">{pctCorrect}%</span>
          </div>
          <div>
            <p className="text-lg font-semibold">{pctCorrect >= 75 ? 'Great work! 🎉' : pctCorrect >= 40 ? 'Good progress! 📈' : 'Keep going! 💪'}</p>
            <p className="text-sm text-muted">Your gap report is now more accurate</p>
          </div>
        </div>

        <ul className="mb-6 divide-y divide-line rounded-xl glass-card">
          {[...byTopic].map(([t, [c, n]]) => (
            <li key={t} className="flex items-center justify-between p-4">
              <span className="font-medium">{t}</span>
              <div className="flex items-center gap-3">
                <div className="h-2 w-24 overflow-hidden rounded-full bg-line">
                  <div className={`h-full rounded-full ${c / n >= 0.75 ? 'bg-strong' : c / n >= 0.4 ? 'bg-medium' : 'bg-weak'} progress-fill`} style={{ width: `${(c / n) * 100}%` }} />
                </div>
                <span className="text-sm font-bold tabular-nums">{c}/{n}</span>
              </div>
            </li>
          ))}
        </ul>
        {skipped.length > 0 && <p className="mb-4 text-sm text-muted">Skipped: {skipped.map((s) => s.topic).join(', ')} (no matching notes).</p>}
        <div className="flex gap-3"><Link href="/" className={btn}>See your gap report</Link><button className={btnGhost} onClick={start}>Take another quiz</button></div>
      </div>
    );
  }

  const q = qs[i];
  const progress = ((i + 1) / qs.length) * 100;
  return (
    <div className="animate-in">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-muted">Question {i + 1} of {qs.length}</span>
          <span className="font-medium text-brand-light">{q.topicName}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-gradient-brand transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <h1 className="read max-w-prose text-2xl font-semibold leading-relaxed">{q.question}</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-muted">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
        {q.citation.title}{q.citation.heading ? `, ${q.citation.heading}` : ''}{q.citation.page ? `, p.${q.citation.page}` : ''}
      </p>

      <div className="mt-6 max-w-2xl space-y-3" role="group" aria-label="Answer options">
        {q.options.map((o, k) => {
          const isCorrect = verdict && k === verdict.correctIndex;
          const isWrong = verdict && k === picked && k !== verdict.correctIndex;
          const state = !verdict ? '' : isCorrect ? 'border-strong bg-strong/10 ring-2 ring-strong/30' : isWrong ? 'border-weak bg-weak/10' : 'opacity-40';
          return (
            <button key={k} onClick={() => answer(k)} disabled={!!verdict || busy}
              className={`group flex w-full gap-4 rounded-xl border border-line bg-surface/50 p-4 text-left transition-all hover:border-brand/30 hover:bg-surface ${state}`}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-all ${isCorrect ? 'bg-strong text-white' : isWrong ? 'bg-weak text-white' : 'bg-surface-elevated text-muted group-hover:bg-brand/20 group-hover:text-brand-light'}`}>
                {String.fromCharCode(65 + k)}
              </span>
              <span className="read flex-1 pt-1">{o}</span>
              {isCorrect && <svg className="mt-1 h-5 w-5 text-strong" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
              {isWrong && <svg className="mt-1 h-5 w-5 text-weak" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>}
            </button>
          );
        })}
      </div>

      {err && <div className="mt-3"><ErrorNote message={err} /></div>}

      {verdict && (
        <section className="animate-in mt-6 max-w-2xl glass-card rounded-2xl p-5" aria-live="polite">
          <div className={`mb-3 flex items-center gap-2 text-lg font-bold ${verdict.correct ? 'text-strong' : 'text-weak'}`}>
            {verdict.correct ? (
              <><svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> Correct!</>
            ) : (
              <><svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg> Not quite. The answer is {String.fromCharCode(65 + verdict.correctIndex)}.</>
            )}
          </div>
          <p className="read leading-relaxed">{verdict.explanation}</p>
          <blockquote className="read mt-3 rounded-lg border-l-4 border-brand pl-4 text-muted italic">
            &ldquo;{verdict.evidence}&rdquo;
            <cite className="mt-1 block font-sans text-xs not-italic">{verdict.citation.title}{verdict.citation.heading ? `, ${verdict.citation.heading}` : ''}</cite>
          </blockquote>
          <button className={`${btn} mt-5`} onClick={next}>{i + 1 >= qs.length ? 'Finish quiz' : 'Next question →'}</button>
        </section>
      )}
    </div>
  );
}
