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
      <PageTitle title="Ask your notes" sub="Answers come only from what you uploaded, with numbered citations. If your material doesn’t cover it, the assistant says so instead of guessing." />
      <form onSubmit={ask} className="space-y-3">
        <div><label htmlFor="topic" className="mb-1 block text-sm font-semibold">Limit to a topic (optional)</label>
          <select id="topic" className={`${field} max-w-sm`} value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            <option value="">All topics</option>{data?.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></div>
        <div><label htmlFor="q" className="mb-1 block text-sm font-semibold">Your question</label>
          <textarea id="q" rows={3} className={field} value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Why are X-linked conditions more common in males?" required minLength={3} maxLength={500} /></div>
        <button className={btn} disabled={busy}>{busy ? 'Searching your notes…' : 'Ask'}</button>
      </form>
      {err && <div className="mt-4"><ErrorNote message={err} /></div>}
      {reply && (
        <section className="mt-6 space-y-4" aria-live="polite">
          {reply.refused ? (
            <div className="rounded-lg border border-medium bg-medium/10 p-4"><p className="font-semibold">Not in your material</p><p className="mt-1">{reply.message}</p>
              {reply.bestSimilarity !== null && <p className="mt-1 text-xs text-muted">Closest passage match: {reply.bestSimilarity.toFixed(2)}, below the answer threshold.</p>}</div>
          ) : (
            <>
              <div className="read whitespace-pre-wrap rounded-lg border border-line bg-surface p-5 text-lg">{reply.answer}</div>
              <div><h2 className="mb-2 font-bold">Sources</h2>
                <ol className="space-y-2">{reply.sources.map((s) => (
                  <li key={s.n} className="rounded-md border border-line bg-surface p-3">
                    <p className="text-sm font-semibold">[{s.n}] {s.title}{s.heading ? `, ${s.heading}` : ''}{s.page ? `, p.${s.page}` : ''} <span className="font-normal text-muted">(match {s.similarity.toFixed(2)})</span></p>
                    <p className="read mt-1 text-sm text-muted">{s.excerpt}…</p>
                  </li>))}</ol></div>
            </>
          )}
        </section>
      )}
    </>
  );
}
