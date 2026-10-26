'use client';
import { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '@/components/Shell';
import { btn, Empty, ErrorNote, field, PageTitle, useDiagnosis } from '@/components/ui';
import { api, supabase } from '@/lib/client';

type Doc = { id: string; title: string; kind: string; chunk_count: number; page_count: number | null; created_at: string };

const KIND_INFO: Record<string, { label: string; icon: string; desc: string; badge: string }> = {
  syllabus: {
    label: 'Syllabus',
    icon: '🎯',
    desc: 'Extracts your topic hierarchy and marks weights to build the diagnosis map.',
    badge: 'bg-brand/20 text-brand-light border-brand/30',
  },
  notes: {
    label: 'Study Notes',
    icon: '📝',
    desc: 'Powers the diagnostic quiz and Q&A citations directly from your materials.',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  textbook: {
    label: 'Textbook Chapter',
    icon: '📖',
    desc: 'Provides comprehensive reference passages to bridge detected learning gaps.',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  past_paper: {
    label: 'Past Paper',
    icon: '📑',
    desc: 'Numbers questions (1., 2.) to calibrate exam topic frequency and importance.',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
};

export default function Materials() {
  const { subject } = useWorkspace();
  const { data, reload: refreshTopics } = useDiagnosis(subject.id);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [kind, setKind] = useState('syllabus');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const loadDocs = useCallback(async () => {
    const { data: d } = await supabase()
      .from('documents')
      .select('id,title,kind,chunk_count,page_count,created_at')
      .eq('subject_id', subject.id)
      .order('created_at', { ascending: false });
    setDocs((d ?? []) as Doc[]);
  }, [subject.id]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setOk('');
    const f = new FormData();
    f.set('subjectId', subject.id);
    f.set('kind', kind);
    f.set('replaceExisting', String(replaceExisting));
    f.set('title', title);
    if (inputMode === 'file' && file) {
      f.set('file', file);
    } else {
      f.set('text', text);
    }

    try {
      const r = await api<{ chunks: number; topics: { total: number; added: number } }>('/api/ingest', {
        method: 'POST',
        body: f,
      });
      setOk(
        r.topics.total > 0 && r.chunks > 0
          ? `✓ Extracted ${r.topics.total} curriculum topics and indexed ${r.chunks} knowledge passages.`
          : r.topics.total > 0
          ? `✓ Extracted ${r.topics.total} curriculum topics (${r.topics.added} newly identified).`
          : `✓ Indexed ${r.chunks} knowledge passages and linked them to your curriculum topics.`
      );
      setTitle('');
      setText('');
      setFile(null);
      setFileKey((k) => k + 1);
      await loadDocs();
      await refreshTopics();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Upload failed. Please check the file format.');
    }
    setBusy(false);
  }

  async function remove(id: string) {
    if (!confirm('Delete this document and its indexed passages? (Your historical diagnostic quiz answers remain intact)')) return;
    await supabase().from('documents').delete().eq('id', id);
    await loadDocs();
    await refreshTopics();
  }

  return (
    <div className="space-y-8 animate-in">
      <PageTitle
        title="Curriculum & Materials"
        sub="GapFinder learns exclusively from your academic documents. Upload your syllabus to generate your diagnostic knowledge map, then add notes and past papers."
      />

      {/* Upload Box */}
      <section className="glass-card rounded-2xl p-6 md:p-8 shadow-card border border-line">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand shadow-glow text-lg">
              📥
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Add Learning Resource</h2>
              <p className="text-xs text-muted">Upload PDF documents or paste textual content</p>
            </div>
          </div>
          <div className="inline-flex rounded-xl border border-line bg-surface/50 p-1">
            <button
              type="button"
              onClick={() => setInputMode('file')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                inputMode === 'file' ? 'bg-brand text-white shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              📁 File Upload
            </button>
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                inputMode === 'text' ? 'bg-brand text-white shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              📝 Paste Text
            </button>
          </div>
        </div>

        <form onSubmit={upload} className="space-y-5">
          {/* Document Type Selector Grid */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
              Document Purpose
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(KIND_INFO).map(([key, info]) => {
                const selected = kind === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setKind(key)}
                    className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                      selected
                        ? 'border-brand bg-brand/10 ring-2 ring-brand/30 shadow-glow'
                        : 'border-line bg-surface/40 hover:border-muted/30 hover:bg-surface/70'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xl">{info.icon}</span>
                      {selected && <span className="h-2 w-2 rounded-full bg-brand-light" />}
                    </div>
                    <span className="mt-2 text-sm font-semibold text-ink">{info.label}</span>
                    <span className="mt-1 line-clamp-2 text-xs text-muted leading-relaxed">{info.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title and optional metadata */}
          <div>
            <label htmlFor="title" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
              Custom Title (Optional)
            </label>
            <input
              id="title"
              className={field}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g. Unit 3 Cellular Energetics ${KIND_INFO[kind]?.label ?? ''}`}
            />
          </div>

          {/* File Upload / Paste Area */}
          {inputMode === 'file' ? (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                Document File (PDF, TXT, MD up to 4MB)
              </label>
              <div
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all ${
                  file
                    ? 'border-brand bg-brand/5'
                    : 'border-line bg-surface/30 hover:border-brand/40 hover:bg-surface/50'
                }`}
              >
                <input
                  key={fileKey}
                  id="file"
                  type="file"
                  accept=".pdf,.txt,.md,.markdown"
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated text-2xl">
                    {file ? '📄' : '☁️'}
                  </div>
                  {file ? (
                    <div>
                      <p className="font-semibold text-ink">{file.name}</p>
                      <p className="mt-1 text-xs text-muted">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to process
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-ink">
                        Click to browse or drag and drop your file here
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        PDF textbooks, class slide exports, lecture notes, or past exams
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="paste" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                Paste Text Content
              </label>
              <textarea
                id="paste"
                rows={6}
                className={`${field} font-mono text-xs leading-relaxed`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste the syllabus sections, chapter text, or past exam questions here..."
              />
            </div>
          )}

          {kind === 'past_paper' && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-200/90 leading-relaxed">
              <span className="text-base shrink-0">💡</span>
              <p>
                <strong>Pro-tip for Past Papers:</strong> Label each question clearly (e.g. <code>1. What is...</code>, <code>2. Explain...</code>) so our AI parses each exam item individually and maps its frequency against your syllabus topics.
              </p>
            </div>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface/30 p-3 text-sm">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-brand"
            />
            <span>
              <span className="font-semibold text-ink">Replace existing {KIND_INFO[kind]?.label.toLowerCase()} material</span>
              <span className="mt-0.5 block text-xs text-muted">
                {kind === 'syllabus'
                  ? 'This resets the topic map, diagnostic quiz history, and plan so every dashboard reflects the new syllabus.'
                  : 'This removes earlier documents of this type before indexing the new one.'}
              </span>
            </span>
          </label>

          {err && <ErrorNote message={err} />}

          {ok && (
            <div className="flex items-center gap-2 rounded-xl border border-strong/30 bg-strong/10 p-4 text-sm font-semibold text-strong">
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{ok}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              className={btn}
              disabled={busy || (inputMode === 'file' ? !file : !text.trim())}
            >
              {busy ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Analyzing & Vectorizing with AI…</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Process & Index Material</span>
                </>
              )}
            </button>
            <p className="text-xs text-muted hidden sm:block">Processed securely into your private subject vector store</p>
          </div>
        </form>
      </section>

      {/* Uploaded Documents List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">Indexed Materials</h2>
            <p className="text-xs text-muted">Documents powering your diagnostic quizzes and gap analysis</p>
          </div>
          <span className="rounded-full border border-line bg-surface/50 px-3 py-1 text-xs font-semibold text-muted">
            {docs.length} {docs.length === 1 ? 'file' : 'files'}
          </span>
        </div>

        {!docs.length ? (
          <Empty
            title="No study materials added yet"
            body="Start by uploading your course syllabus. It acts as the backbone of your diagnostic topic hierarchy."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {docs.map((d) => {
              const info = KIND_INFO[d.kind] ?? {
                label: d.kind,
                icon: '📄',
                badge: 'bg-surface-elevated text-muted border-line',
              };
              return (
                <div
                  key={d.id}
                  className="glass-card stat-card flex flex-col justify-between rounded-xl border border-line p-4 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-2xl mt-0.5">{info.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink text-sm" title={d.title}>
                          {d.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${info.badge}`}>
                            {info.label}
                          </span>
                          {d.kind !== 'syllabus' && (
                            <span className="text-xs text-muted">
                              {d.chunk_count} passages
                            </span>
                          )}
                          {d.page_count && (
                            <span className="text-xs text-muted">
                              · {d.page_count} pgs
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      className="rounded-lg p-1.5 text-muted hover:bg-weak/10 hover:text-weak transition-colors"
                      title="Delete document"
                      onClick={() => remove(d.id)}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11px] text-muted">
                    <span>Uploaded {new Date(d.created_at).toLocaleDateString()}</span>
                    <span className="text-brand-light font-medium">Indexed</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Curriculum Topic Map Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">Curriculum Topic Map</h2>
            <p className="text-xs text-muted">
              Topics extracted from your syllabus with syllabus mark weights and note coverage
            </p>
          </div>
          {data?.topics && (
            <span className="rounded-full border border-line bg-surface/50 px-3 py-1 text-xs font-semibold text-muted">
              {data.topics.length} topics
            </span>
          )}
        </div>

        {!data?.topics.length ? (
          <div className="glass-card rounded-2xl border border-dashed border-line p-8 text-center text-muted">
            <p className="text-sm">Topics will appear here automatically as soon as your syllabus is processed.</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden rounded-2xl border border-line shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface/80 text-xs font-semibold uppercase tracking-wider text-muted">
                    <th className="p-4">Topic Name</th>
                    <th className="p-4 text-center">Syllabus Weight</th>
                    <th className="p-4">Notes Passages</th>
                    <th className="p-4">Past Exam Frequency</th>
                    <th className="p-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.topics.map((t) => {
                    const hasPassages = t.chunkCount > 0;
                    return (
                      <tr key={t.id} className="transition-colors hover:bg-surface-elevated/40">
                        <td className="p-4">
                          <p className="font-semibold text-ink">{t.name}</p>
                          {t.description && (
                            <p className="line-clamp-1 text-xs text-muted max-w-md mt-0.5">
                              {t.description}
                            </p>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-bold text-brand-light">
                            {t.weight} pts
                          </span>
                        </td>
                        <td className="p-4">
                          {hasPassages ? (
                            <span className="font-medium text-ink flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-strong" />
                              {t.chunkCount} {t.chunkCount === 1 ? 'passage' : 'passages'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-weak/30 bg-weak/10 px-2 py-0.5 text-xs font-semibold text-weak">
                              <span>⚠️</span> 0 passages (unquizzable)
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-line">
                              <div
                                className="h-full rounded-full bg-brand"
                                style={{ width: `${Math.round(t.paperFreq * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-muted">
                              {Math.round(t.paperFreq * 100)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              hasPassages
                                ? 'bg-strong/15 text-strong'
                                : 'bg-weak/15 text-weak'
                            }`}
                          >
                            {hasPassages ? 'Active' : 'Needs Notes'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
