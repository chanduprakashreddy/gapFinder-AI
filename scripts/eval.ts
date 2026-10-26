// Measures the three things that decide whether the diagnosis can be trusted:
//   1. topic linking accuracy  2. retrieval hit@k / MRR + refusal behaviour  3. question groundedness
// Usage: npm run eval   (run `npm run seed` first; evaluates the demo account)
import { createClient } from '@supabase/supabase-js';
import { generateObject } from 'ai';
import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { chatModel } from '../lib/ai';
import { generateForTopic } from '../lib/quiz';
import { retrieve } from '../lib/rag';

const gold = JSON.parse(readFileSync('samples/eval.json', 'utf8'));
const MIN_SIM = Number(process.env.EXPLAIN_MIN_SIM ?? 0.35);
const pc = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(0)}% (${a}/${b})` : 'n/a');

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { error } = await sb.auth.signInWithPassword({ email: process.env.DEMO_EMAIL ?? 'demo@gapfinder.ai', password: process.env.DEMO_PASSWORD ?? 'GapFinder#2026' });
  if (error) throw error;
  const { data: subject } = await sb.from('subjects').select('id').order('created_at').limit(1).single();
  if (!subject) throw new Error('No subject found. Run `npm run seed` first.');
  const report: Record<string, unknown> = {};

  // 1. Topic linking: is each chunk attached to the right topic?
  const { data: chunks } = await sb.from('chunks').select('heading,topic_score,topics(name)').eq('subject_id', subject.id).neq('kind', 'past_paper');
  let linkHit = 0, linkTotal = 0;
  for (const g of gold.linking) {
    for (const c of (chunks ?? []).filter((x: any) => x.heading?.includes(g.headingContains))) {
      linkTotal++;
      if ((c as any).topics?.name?.includes(g.topicContains)) linkHit++;
    }
  }
  report.topicLinking = { accuracy: pc(linkHit, linkTotal) };

  // 2. Retrieval quality and refusal behaviour
  let h1 = 0, h3 = 0, rr = 0;
  for (const c of gold.retrieval) {
    const got = await retrieve(sb, { query: c.query, subjectId: subject.id, k: 3 });
    const rank = got.findIndex((p) => c.expect.some((e: string) => p.heading.includes(e)));
    if (rank === 0) h1++;
    if (rank >= 0) { h3++; rr += 1 / (rank + 1); }
  }
  let refused = 0;
  for (const q of gold.offTopic) { const got = await retrieve(sb, { query: q, subjectId: subject.id, k: 1 }); if (!got[0] || got[0].similarity < MIN_SIM) refused++; }
  let answered = 0;
  for (const c of gold.retrieval) { const got = await retrieve(sb, { query: c.query, subjectId: subject.id, k: 1 }); if (got[0] && got[0].similarity >= MIN_SIM) answered++; }
  const n = gold.retrieval.length;
  report.retrieval = {
    'hit@1': pc(h1, n), 'hit@3': pc(h3, n), MRR: (rr / n).toFixed(2),
    offTopicCorrectlyRefused: pc(refused, gold.offTopic.length), inScopeCorrectlyAnswered: pc(answered, n), threshold: MIN_SIM,
  };

  // 3. Question groundedness: how many raw model questions survive the citation + verbatim-evidence check,
  //    and does an independent LLM judge agree the cited passage supports the keyed answer?
  const { data: topics } = await sb.from('topics').select('id,name,description').eq('subject_id', subject.id);
  let produced = 0, accepted = 0, judged = 0, supported = 0;
  for (const t of topics ?? []) {
    const r = await generateForTopic(sb, subject.id, t, 3);
    accepted += r.questions.length; produced += r.questions.length + r.rejected;
    const byId = new Map(r.passages.map((p) => [p.id, p]));
    for (const q of r.questions) {
      const { object } = await generateObject({
        model: chatModel(), schema: z.object({ supported: z.boolean(), onlyOneCorrect: z.boolean() }),
        prompt: `Passage:\n${byId.get(q.chunk_id)?.content}\n\nQuestion: ${q.question}\nOptions:\n${q.options.map((o, i) => `${i}. ${o}`).join('\n')}\nKeyed answer: ${q.correct_index}\n\nUsing ONLY the passage: is the keyed answer supported (supported), and is it the only correct option (onlyOneCorrect)?`,
      });
      judged++; if (object.supported && object.onlyOneCorrect) supported++;
    }
  }
  report.questions = { passedCitationAndEvidenceCheck: pc(accepted, produced), judgeSaysSupportedAndUnambiguous: pc(supported, judged) };

  console.log(JSON.stringify(report, null, 2));
  writeFileSync('eval-report.json', JSON.stringify({ ranAt: new Date().toISOString(), model: process.env.CHAT_MODEL ?? 'gpt-4o-mini', ...report }, null, 2));
  console.log('\nSaved eval-report.json');
}
main().catch((e) => { console.error(e); process.exit(1); });
