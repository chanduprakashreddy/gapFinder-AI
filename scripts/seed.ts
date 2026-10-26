// Creates the demo user, loads the sample syllabus/notes/past paper, and simulates three quiz attempts
// (so the gap report and progress dashboard are populated for judges). Re-running resets the demo account.
// Usage: npm run seed
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { ingestDocument } from '../lib/ingest';
import { createQuiz } from '../lib/quiz';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_KEY!;
const EMAIL = process.env.DEMO_EMAIL ?? 'demo@gapfinder.ai';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'GapFinder#2026';
const read = (f: string) => readFileSync(`samples/${f}`, "utf8"); // run from the repo root via npm run seed

// Deterministic "student": per-topic chance of answering correctly in each of three sessions (days ago: 12, 6, 1).
const PROFILE = [[0.6, 0.8, 0.9], [0.3, 0.4, 0.6], [0.2, 0.25, 0.3], [0.5, 0.55, 0.7], [0.3, 0.45, 0.5]];
const DAYS_AGO = [12, 6, 1];
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

async function main() {
  if (!URL || !ANON || !SERVICE) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_KEY in .env.local');
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const old = list?.users.find((u) => u.email === EMAIL);
  if (old) await admin.auth.admin.deleteUser(old.id); // cascades to all of the demo user's rows
  const { data: created, error } = await admin.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true });
  if (error || !created.user) throw error ?? new Error('Could not create demo user');
  const userId = created.user.id;

  // From here on, act as the demo user so row-level security is exercised exactly as in production.
  const sb = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: se } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (se) throw se;

  const exam = new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10);
  const { data: subject, error: sub } = await sb.from('subjects')
    .insert({ user_id: userId, name: 'Biology 101: Cells and Energy', exam_date: exam, daily_minutes: 90 }).select('id').single();
  if (sub || !subject) throw sub;

  for (const [kind, title, file] of [
    ['syllabus', 'Biology 101 Syllabus', 'biology-syllabus.md'],
    ['notes', 'Biology 101 Notes', 'biology-notes.md'],
    ['past_paper', 'Past Paper 2024', 'biology-past-paper-2024.md'],
  ] as const) {
    const r = await ingestDocument(sb, userId, { subjectId: subject.id, kind, title, pages: [{ page: 1, text: read(file) }] });
    console.log(`ingested ${title}: ${r.chunks} passages, ${r.topics.total} topics, ${r.linked} links`);
  }

  for (let s = 0; s < 1; s++) {
    const quiz = await createQuiz(sb, userId, subject.id, { count: 15 });
    const topicIndex = new Map<string, number>();
    const { data: topics } = await sb.from('topics').select('id,position').eq('subject_id', subject.id).order('position');
    topics?.forEach((t, i) => topicIndex.set(t.id, i));
    const when = Date.now() - DAYS_AGO[s] * 86_400_000;
    const rows = quiz.keys.map((k, n) => {
      const p = PROFILE[(topicIndex.get(k.topicId) ?? 0) % PROFILE.length][s];
      const correct = rand() < p;
      const selected = correct ? k.correctIndex : (k.correctIndex + 1 + Math.floor(rand() * 3)) % 4;
      return {
        user_id: userId, subject_id: subject.id, quiz_id: quiz.quizId, question_id: k.id, topic_id: k.topicId,
        selected_index: selected, correct, difficulty: k.difficulty, created_at: new Date(when + n * 60_000).toISOString(),
      };
    });
    const { error: ae } = await sb.from('attempts').insert(rows);
    if (ae) throw ae;
    await sb.from('quizzes').update({ created_at: new Date(when).toISOString() }).eq('id', quiz.quizId);
    console.log(`simulated quiz ${s + 1}: ${rows.filter((r) => r.correct).length}/${rows.length} correct`);
  }
  console.log(`\nDemo ready. Sign in with ${EMAIL} / ${PASSWORD}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
