'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/client';
import { btn, btnGhost, ErrorNote, field } from '@/components/ui';

const DEMO = { email: 'demo@gapfinder.ai', password: 'GapFinder#2026' };

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function go(e: string, p: string, m = mode) {
    setBusy(true); setMsg('');
    const sb = supabase();
    const { data, error } = m === 'in' ? await sb.auth.signInWithPassword({ email: e, password: p }) : await sb.auth.signUp({ email: e, password: p });
    setBusy(false);
    if (error) return setMsg(error.message);
    if (!data.session) return setMsg('Check your inbox to confirm your email, then sign in.');
    router.replace('/');
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-5xl items-center gap-10 p-6 md:grid-cols-2">
      <section>
        <h1 className="text-5xl font-bold leading-[1.05] tracking-tight">Find the topics you don’t know you’re missing.</h1>
        <p className="read mt-4 max-w-md text-lg text-muted">
          Upload your syllabus and notes. GapFinder quizzes you from your own material, shows where you stand topic by topic, and plans your revision around the gaps.
        </p>
        <div className="mt-6 flex max-w-xs overflow-hidden rounded-md" aria-hidden>
          {['bg-weak', 'bg-medium', 'bg-strong', 'hatch'].map((c, i) => <div key={i} className={`h-3 flex-1 ${c}`} />)}
        </div>
      </section>
      <section className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-xl font-bold">{mode === 'in' ? 'Sign in' : 'Create an account'}</h2>
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); go(email, password); }}>
          <div><label htmlFor="email" className="mb-1 block text-sm font-semibold">Email</label>
            <input id="email" type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
          <div><label htmlFor="pw" className="mb-1 block text-sm font-semibold">Password</label>
            <input id="pw" type="password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></div>
          {msg && <ErrorNote message={msg} />}
          <button className={`${btn} w-full`} disabled={busy}>{mode === 'in' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button className="mt-3 text-sm underline" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}
        </button>
        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-2 text-sm text-muted">Judging or exploring? The demo account has a syllabus, notes, a past paper and three quiz attempts already loaded.</p>
          <button className={`${btnGhost} w-full`} disabled={busy} onClick={() => go(DEMO.email, DEMO.password, 'in')}>Open the demo account</button>
          <p className="mt-2 text-xs text-muted">{DEMO.email} / {DEMO.password}</p>
        </div>
      </section>
    </main>
  );
}
