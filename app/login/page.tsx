'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/client';

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image src="/hero-bg.jpg" alt="" fill className="object-cover opacity-30" priority />
        <div className="absolute inset-0 bg-gradient-to-br from-paper/95 via-paper/80 to-paper/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-paper via-transparent to-transparent" />
      </div>

      {/* Animated Glow Orbs */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-brand/10 blur-[100px] animate-pulse" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-brand-light/10 blur-[80px] animate-pulse" style={{ animationDelay: '1.5s' }} />

      <div className="relative z-10 mx-auto grid w-full max-w-5xl gap-12 p-6 md:grid-cols-2 md:items-center">
        {/* Hero Section */}
        <section className="animate-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface/50 px-4 py-1.5 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-light opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-light" />
            </span>
            <span className="text-sm font-medium text-muted">AI-Powered Study Gap Analysis</span>
          </div>
          <h1 className="text-5xl font-bold leading-[1.08] tracking-tight md:text-6xl">
            Find the topics you
            <span className="relative ml-2 inline-block">
              <span className="relative z-10 bg-gradient-to-r from-brand-light to-brand bg-clip-text text-transparent">don&apos;t know</span>
            </span>
            {' '}you&apos;re missing.
          </h1>
          <p className="read mt-5 max-w-md text-lg leading-relaxed text-muted">
            Upload your syllabus and notes. GapFinder quizzes you from your own material, shows where you stand topic by topic, and plans your revision around the gaps.
          </p>

          {/* Feature Pills */}
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              { icon: '📚', label: 'RAG-Powered' },
              { icon: '🎯', label: 'Gap Detection' },
              { icon: '📊', label: 'Smart Planning' },
              { icon: '🔒', label: 'Your Data Only' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 rounded-lg border border-line bg-surface/40 px-3 py-2 backdrop-blur-sm transition-all hover:border-brand/30 hover:bg-surface/60">
                <span>{f.icon}</span>
                <span className="text-sm font-medium">{f.label}</span>
              </div>
            ))}
          </div>

          {/* Mastery Bar */}
          <div className="mt-8 flex max-w-xs overflow-hidden rounded-lg" aria-hidden>
            {[
              { color: 'bg-weak', w: '25%' },
              { color: 'bg-medium', w: '30%' },
              { color: 'bg-strong', w: '35%' },
              { color: 'hatch', w: '10%' },
            ].map((c, i) => (
              <div key={i} className={`h-2 ${c.color}`} style={{ width: c.w, animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Weak · Medium · Strong · Not yet rated</p>
        </section>

        {/* Login Card */}
        <section className="animate-in animate-in-delay">
          <div className="glass-card rounded-2xl p-8 shadow-glow">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand shadow-glow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">{mode === 'in' ? 'Welcome back' : 'Get started'}</h2>
                <p className="text-sm text-muted">{mode === 'in' ? 'Sign in to your account' : 'Create a new account'}</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); go(email, password); }}>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-muted">Email address</label>
                <input id="email" type="email"
                  className="w-full rounded-xl border border-line bg-surface/50 px-4 py-3 text-sm text-ink placeholder-muted/50 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
                  value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                  placeholder="you@university.edu" />
              </div>
              <div>
                <label htmlFor="pw" className="mb-1.5 block text-sm font-medium text-muted">Password</label>
                <input id="pw" type="password"
                  className="w-full rounded-xl border border-line bg-surface/50 px-4 py-3 text-sm text-ink placeholder-muted/50 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
                  value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                  placeholder="••••••••" />
              </div>

              {msg && (
                <div className="flex items-start gap-2 rounded-xl border border-weak/30 bg-weak/10 px-4 py-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-weak" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-weak">{msg}</p>
                </div>
              )}

              <button disabled={busy}
                className="relative w-full overflow-hidden rounded-xl bg-gradient-brand px-4 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-elevated hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed">
                {busy && <span className="absolute inset-0 shimmer" />}
                {mode === 'in' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <button className="mt-4 block w-full text-center text-sm text-muted transition-colors hover:text-ink" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
              {mode === 'in' ? (
                <>New here? <span className="font-semibold text-brand-light">Create an account</span></>
              ) : (
                <>Have an account? <span className="font-semibold text-brand-light">Sign in</span></>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-line" /></div>
              <div className="relative flex justify-center"><span className="bg-[#141c25] px-3 text-xs text-muted">or try the demo</span></div>
            </div>

            <div className="rounded-xl border border-line bg-surface/30 p-4">
              <p className="mb-3 text-sm text-muted">Judging or exploring? The demo has a syllabus, notes, a past paper and three quiz attempts preloaded.</p>
              <button disabled={busy} onClick={() => go(DEMO.email, DEMO.password, 'in')}
                className="w-full rounded-xl border border-brand/30 bg-brand/10 px-4 py-2.5 text-sm font-semibold text-brand-light transition-all hover:border-brand/50 hover:bg-brand/20 disabled:opacity-50">
                ✨ Open demo account
              </button>
              <p className="mt-2 text-center text-xs text-muted/60">{DEMO.email} / {DEMO.password}</p>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Attribution */}
      <div className="absolute bottom-4 left-0 right-0 z-10 text-center">
        <p className="text-xs text-muted/50">Powered by Gemini AI + RAG · Built with Next.js</p>
      </div>
    </main>
  );
}
