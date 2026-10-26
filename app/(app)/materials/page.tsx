'use client';
import { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '@/components/Shell';
import { btn, Empty, ErrorNote, field, PageTitle, useDiagnosis } from '@/components/ui';
import { api, supabase } from '@/lib/client';

type Doc = { id: string; title: string; kind: string; chunk_count: number; page_count: number | null; created_at: string };
const KIND: Record<string, string> = { syllabus: 'Syllabus', notes: 'Notes', textbook: 'Textbook chapter', past_paper: 'Past paper' };

export default function Materials() {
  const { subject } = useWorkspace();
  const { data, reload: refreshTopics } = useDiagnosis(subject.id);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [kind, setKind] = useState('syllabus');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const loadDocs = useCallback(async () => {
    const { data: d } = await supabase().from('documents').select('id,title,kind,chunk_count,page_count,created_at').eq('subject_id', subject.id).order('created_at');
    setDocs((d ?? []) as Doc[]);
  }, [subject.id]);
  useEffect(() => { loadDocs(); }, [loadDocs]);

  async function upload(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(''); setOk('');
    const f = new FormData();
    f.set('subjectId', subject.id); f.set('kind', kind); f.set('title', title);
    if (file) f.set('file', file); else f.set('text', text);
    try {
      const r = await api<{ chunks: number; topics: { total: number; added: number } }>('/api/ingest', { method: 'POST', body: f });
      setOk(kind === 'syllabus' ? `Found ${r.topics.total} topics (${r.topics.added} new).` : `Added ${r.chunks} passages and linked them to your topics.`);
      setTitle(''); setText(''); setFile(null);
      setFileKey((k) => k + 1);
      await loadDocs(); await refreshTopics();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Upload failed.'); }
    setBusy(false);
  }

  async function remove(id: string) {
    if (!confirm('Delete this document and its passages? Your past answers stay.')) return;
    await supabase().from('documents').delete().eq('id', id);
    await loadDocs(); await refreshTopics();
  }

  return (
    <>
      <PageTitle title="Materials" sub="Add your syllabus first. It becomes the topic map. Then add notes, textbook chapters and past papers." />
      <form onSubmit={upload} className="space-y-3 rounded-lg border border-line bg-surface p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div><label htmlFor="kind" className="mb-1 block text-sm font-semibold">Document type</label>
            <select id="kind" className={field} value={kind} onChange={(e) => setKind(e.target.value)}>
              {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div><label htmlFor="title" className="mb-1 block text-sm font-semibold">Title (optional)</label>
            <input id="title" className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 4 notes" /></div>
        </div>
        <div><label htmlFor="file" className="mb-1 block text-sm font-semibold">PDF, .txt or .md file (up to 4 MB)</label>
          <input key={fileKey} id="file" type="file" accept=".pdf,.txt,.md,.markdown" className="block text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
        {!file && <div><label htmlFor="paste" className="mb-1 block text-sm font-semibold">Or paste text</label>
          <textarea id="paste" rows={5} className={field} value={text} onChange={(e) => setText(e.target.value)} /></div>}
        {kind === 'past_paper' && <p className="text-sm text-muted">Number each question (1. 2. 3.) so each one is matched to its own topic. Past papers set how often a topic is examined; quizzes are written from notes and textbooks.</p>}
        {err && <ErrorNote message={err} />}
        {ok && <p role="status" className="text-sm font-semibold text-strong">{ok}</p>}
        <button className={btn} disabled={busy || (!file && !text.trim())}>{busy ? 'Reading and indexing…' : 'Upload'}</button>
      </form>

      <h2 className="mb-2 mt-8 text-xl font-bold">Your documents</h2>
      {!docs.length ? <Empty title="Nothing uploaded yet" body="Start with the syllabus." /> : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 p-3">
              <div><p className="font-semibold">{d.title}</p>
                <p className="text-sm text-muted">{KIND[d.kind]}{d.kind !== 'syllabus' ? `, ${d.chunk_count} passages` : ''}{d.page_count ? `, ${d.page_count} page${d.page_count > 1 ? 's' : ''}` : ''}</p></div>
              <button className="text-sm text-weak underline" onClick={() => remove(d.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-2 mt-8 text-xl font-bold">Topic map</h2>
      {!data?.topics.length ? <p className="text-muted">Topics appear here once your syllabus is uploaded.</p> : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted"><tr><th className="p-3 font-semibold">Topic</th><th className="p-3 font-semibold">Weight</th><th className="p-3 font-semibold">Passages from notes</th><th className="p-3 font-semibold">Past-paper frequency</th></tr></thead>
            <tbody>{data.topics.map((t) => (
              <tr key={t.id} className="border-b border-line last:border-0">
                <td className="p-3 font-semibold">{t.name}</td><td className="p-3">{t.weight}</td>
                <td className={`p-3 ${t.chunkCount === 0 ? 'font-semibold text-weak' : ''}`}>{t.chunkCount === 0 ? 'None. Cannot be quizzed' : t.chunkCount}</td>
                <td className="p-3">{Math.round(t.paperFreq * 100)}%</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
