'use client';
import { useEffect, useState } from 'react';
import { useWorkspace } from '@/components/Shell';
import { btn, ErrorNote, field, PageTitle, useDiagnosis } from '@/components/ui';
import { api } from '@/lib/client';

type Source = { n: number; title: string; heading: string; page: number | null; similarity: number; excerpt: string };
type Reply = { refused: boolean; answer: string | null; message?: string; sources: Source[]; bestSimilarity: number | null };

export default function Ask() {
  const { subject } = useWorkspace();
  const { data } = useDiagnosis(subject.id);
  const [q, setQ] = useState('');
  const [topicId, setTopicId] = useState('');
  const [reply, setReply] = useState<Reply | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('topic');
    if (t && data) {
      const topic = data.topics.find((x) => x.id === t);
      if (topic) { setTopicId(t); setQ(`Explain ${topic.name} in simple terms.`); }
    }
  }, [data]);

  async function ask(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(''); setReply(null);
    try { setReply(await api<Reply>('/api/explain', { method: 'POST', body: JSON.stringify({ subjectId: subject.id, question: q, topicId: topicId || null }) })); }
    catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Something went wrong.'); }
    setBusy(false);
  }

  return (
    <>
      <PageTitle title="Ask your notes" sub="Answers come only from what you uploaded, with numbered citations. If your material doesn't cover it, the assistant says so instead of guessing." />

      <form onSubmit={ask} className="glass-card rounded-2xl p-6 space-y-4 animate-in">
        <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
          <div>
            <label htmlFor="topic" className="mb-1.5 block text-sm font-medium text-muted">Limit to a topic (optional)</label>
            <select id="topic" className={field} value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              <option value="">All topics</option>{data?.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="q" className="mb-1.5 block text-sm font-medium text-muted">Your question</label>
          <textarea id="q" rows={3} className={field} value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Why are X-linked conditions more common in males?" required minLength={3} maxLength={500} />
        </div>
        <button id="ask-submit-btn" className={btn} disabled={busy}>
          {busy ? (
            <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Searching your notes…</>
          ) : (
            <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> Ask</>
          )}
        </button>
      </form>

      {err && <div className="mt-4"><ErrorNote message={err} /></div>}

      {reply && (
        <section className="mt-6 space-y-4 animate-in" aria-live="polite">
          {reply.refused ? (
            <div className="glass-card rounded-2xl border border-medium/30 bg-medium/5 p-6">
              <div className="flex items-center gap-2 text-medium">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                <p className="font-semibold">Not in your material</p>
              </div>
              <p className="mt-2 text-muted">{reply.message}</p>
              {reply.bestSimilarity !== null && <p className="mt-2 text-xs text-muted/60">Closest passage match: {reply.bestSimilarity.toFixed(2)}, below the answer threshold.</p>}
            </div>
          ) : (
            <>
              <div className="glass-card rounded-2xl p-6">
                <div className="mb-3 flex items-center gap-2 text-brand-light">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>
                  <span className="text-sm font-semibold">AI Answer</span>
                </div>
                <div className="read whitespace-pre-wrap text-lg leading-relaxed">{reply.answer}</div>
              </div>

              <div>
                <h2 className="mb-3 flex items-center gap-2 font-bold">
                  <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  Sources
                </h2>
                <ol className="space-y-3">
                  {reply.sources.map((s) => (
                    <li key={s.n} className="stat-card glass-card rounded-xl p-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand/15 text-xs font-bold text-brand-light">{s.n}</span>
                        <p className="text-sm font-semibold">{s.title}{s.heading ? `, ${s.heading}` : ''}{s.page ? `, p.${s.page}` : ''}</p>
                        <span className="ml-auto text-xs text-muted">Match: {s.similarity.toFixed(2)}</span>
                      </div>
                      <p className="read mt-2 text-sm text-muted">{s.excerpt}…</p>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
