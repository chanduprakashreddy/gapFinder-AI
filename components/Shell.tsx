'use client';
import Image from 'next/image';
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
  { href: '/', label: 'Gap Report', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { href: '/quiz', label: 'Diagnostic Quiz', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/plan', label: 'Revision Plan', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { href: '/ask', label: 'Ask Notes', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
  { href: '/progress', label: 'Progress', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { href: '/materials', label: 'Materials', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
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
      <label className="block text-sm font-medium text-muted" htmlFor="subject-name">Subject name</label>
      <input id="subject-name" className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Biology, Organic Chemistry" required minLength={2} />
      {err && <ErrorNote message={err} />}
      <div className="flex gap-2">
        <button className={btn}>Create subject</button>
        {onCancel && <button type="button" className="text-sm text-muted hover:text-ink transition-colors" onClick={onCancel}>Cancel</button>}
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
  const [mobileNav, setMobileNav] = useState(false);

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

  if (!user || !loaded) return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-line border-t-brand" />
        <p className="text-muted">Loading your workspace…</p>
      </div>
    </div>
  );

  if (!subject) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper">
        <div className="glass-card mx-auto max-w-md rounded-2xl p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Create your first subject</h1>
          <p className="mb-6 mt-2 text-muted">Each subject has its own syllabus, notes, quizzes and plan.</p>
          <NewSubject user={user} onCreated={async (id) => { setSubjectId(id); await reload(); }} />
        </div>
      </main>
    );
  }

  return (
    <Workspace.Provider value={{ user, subject, subjects, setSubjectId, reload }}>
      <div className="relative flex min-h-screen bg-paper overflow-x-hidden">
        {/* Ambient Study Dashboard Background */}
        <div className="pointer-events-none fixed inset-0 z-0 select-none overflow-hidden">
          <Image
            src="/dashboard-bg.png"
            alt=""
            fill
            className="object-cover object-top opacity-[0.06] filter contrast-125 saturate-110"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-paper/40 via-paper/85 to-paper" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-paper/70 to-paper" />
        </div>

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-line bg-surface/90 backdrop-blur-md transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="p-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand shadow-glow">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </div>
                <span className="text-lg font-bold tracking-tight">GapFinder<span className="bg-gradient-to-r from-brand-light to-brand bg-clip-text text-transparent"> AI</span></span>
              </Link>
            </div>

            {/* Subject Picker */}
            <div className="px-5 pb-4">
              <label htmlFor="subject" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">Subject</label>
              <select id="subject" className={`${field} !bg-surface-elevated`} value={subject.id} onChange={(e) => setSubjectId(e.target.value)}>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {adding
                ? <div className="mt-3"><NewSubject user={user} onCancel={() => setAdding(false)} onCreated={async (id) => { setSubjectId(id); await reload(); setAdding(false); }} /></div>
                : <button className="mt-2 flex items-center gap-1 text-sm text-brand-light transition-colors hover:text-brand" onClick={() => setAdding(true)}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    Add subject
                  </button>}
            </div>

            {/* Navigation */}
            <nav aria-label="Main" className="flex-1 space-y-1 px-3">
              {NAV.map(({ href, label, icon }) => {
                const on = href === '/' ? path === '/' : path.startsWith(href);
                return (
                  <Link key={href} href={href} aria-current={on ? 'page' : undefined}
                    onClick={() => setMobileNav(false)}
                    className={`group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${on ? 'bg-brand/15 text-brand-light shadow-sm' : 'text-muted hover:bg-surface-elevated hover:text-ink'}`}>
                    <svg className={`h-5 w-5 shrink-0 ${on ? 'text-brand-light' : 'text-muted group-hover:text-ink'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d={icon} />
                    </svg>
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* User Section */}
            <div className="border-t border-line p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-white">
                  {user.email?.[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.email}</p>
                  <button className="text-xs text-muted transition-colors hover:text-weak" onClick={() => supabase().auth.signOut()}>Sign out</button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileNav && <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setMobileNav(false)} />}

        {/* Main content */}
        <div className="relative z-10 flex min-w-0 flex-1 flex-col">
          {/* Mobile header */}
          <header className="flex items-center gap-3 border-b border-line bg-surface p-4 md:hidden">
            <button onClick={() => setMobileNav(true)} className="rounded-lg p-1.5 hover:bg-surface-elevated">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <span className="text-sm font-bold">GapFinder<span className="text-brand-light"> AI</span></span>
          </header>

          <main className="min-w-0 flex-1 p-5 md:p-8">
            <div className="mx-auto max-w-5xl">{children}</div>
          </main>
        </div>
      </div>
    </Workspace.Provider>
  );
}
