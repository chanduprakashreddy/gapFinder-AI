'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/client';
import type { Subject } from '@/lib/types';
import { btn, ErrorNote, field } from './ui';

type Ctx = { user: User; subject: Subject; subjects: Subject[]; setSubjectId: (id: string) => void; reload: () => Promise<void> };
const Workspace = createContext<Ctx | null>(null);
export function useWorkspace() {
  const c = useContext(Workspace);
  if (!c) throw new Error('useWorkspace must be used inside Shell');
  return c;
}

const NAV = [
  ['/', 'Gap report'], ['/quiz', 'Diagnostic quiz'], ['/plan', 'Revision plan'],
  ['/ask', 'Ask your notes'], ['/progress', 'Progress'], ['/materials', 'Materials'],
] as const;

function NewSubject({ user, onCreated, onCancel }: { user: User; onCreated: (id: string) => void; onCancel?: () => void }) {
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  async function create(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase().from('subjects').insert({ user_id: user.id, name: name.trim() }).select('id').single();
    if (error || !data) return setErr(error?.message ?? 'Could not create the subject.');
    onCreated(data.id);
  }
  return (
    <form onSubmit={create} className="space-y-3">
      <label className="block text-sm font-semibold" htmlFor="subject-name">Subject name</label>
      <input id="subject-name" className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Biology, Organic Chemistry" required minLength={2} />
      {err && <ErrorNote message={err} />}
      <div className="flex gap-2">
        <button className={btn}>Create subject</button>
        {onCancel && <button type="button" className="text-sm text-muted underline" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => (data.session ? setUser(data.session.user) : router.replace('/login')));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => (s ? setUser(s.user) : router.replace('/login')));
    return () => sub.subscription.unsubscribe();
  }, [router]);

  const reload = useCallback(async () => {
    const { data } = await supabase().from('subjects').select('id,name,exam_date,daily_minutes').order('created_at');
    const list = (data ?? []) as Subject[];
    setSubjects(list);
    setActiveId((cur) => {
      const want = cur ?? localStorage.getItem('gf-subject');
      return list.find((s) => s.id === want)?.id ?? list[0]?.id ?? null;
    });
    setLoaded(true);
  }, []);
  useEffect(() => { if (user?.id) reload(); }, [user?.id, reload]);

  const setSubjectId = (id: string) => { localStorage.setItem('gf-subject', id); setActiveId(id); };
  const subject = subjects.find((s) => s.id === activeId);

  if (!user || !loaded) return <p className="p-8 text-muted">Loading your workspace…</p>;
  if (!subject) {
    return (
      <main className="mx-auto max-w-md p-8">
        <h1 className="text-2xl font-bold">Create your first subject</h1>
        <p className="mb-4 mt-1 text-muted">Each subject has its own syllabus, notes, quizzes and plan.</p>
        <NewSubject user={user} onCreated={async (id) => { setSubjectId(id); await reload(); }} />
      </main>
    );
  }

  return (
    <Workspace.Provider value={{ user, subject, subjects, setSubjectId, reload }}>
      <div className="md:flex">
        <aside className="border-b border-line bg-surface md:min-h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
          <div className="p-4 md:p-5">
            <Link href="/" className="text-xl font-bold tracking-tight">GapFinder<span className="text-brand"> AI</span></Link>
            <div className="mt-4">
              <label htmlFor="subject" className="mb-1 block text-xs font-semibold text-muted">Subject</label>
              <select id="subject" className={field} value={subject.id} onChange={(e) => setSubjectId(e.target.value)}>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {adding
                ? <div className="mt-3"><NewSubject user={user} onCancel={() => setAdding(false)} onCreated={async (id) => { setSubjectId(id); await reload(); setAdding(false); }} /></div>
                : <button className="mt-2 text-sm text-brand underline" onClick={() => setAdding(true)}>Add a subject</button>}
            </div>
          </div>
          <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:px-3">
            {NAV.map(([href, label]) => {
              const on = href === '/' ? path === '/' : path.startsWith(href);
              return (
                <Link key={href} href={href} aria-current={on ? 'page' : undefined}
                  className={`block whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${on ? 'bg-brand text-white' : 'text-ink hover:bg-paper'}`}>
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden p-5 md:block">
            <p className="truncate text-xs text-muted">{user.email}</p>
            <button className="mt-1 text-sm underline" onClick={() => supabase().auth.signOut()}>Sign out</button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-8"><div className="mx-auto max-w-5xl">{children}</div></main>
      </div>
    </Workspace.Provider>
  );
}
