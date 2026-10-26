import { authed, fail, HttpError } from '@/lib/server';
import { buildPlan, computeGaps, overallMastery, type Attempt } from '@/lib/gap';
import type { Diagnosis, HistoryPoint, ReviseSource } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Gap analysis and planning. Pure code (lib/gap.ts) over stored attempts; no LLM involved. */
export async function GET(req: Request) {
  try {
    const { sb } = await authed(req);
    const subjectId = new URL(req.url).searchParams.get('subjectId');
    if (!subjectId) throw new HttpError(400, 'subjectId is required.');

    const [s, t, a, c, m] = await Promise.all([
      sb.from('subjects').select('id,name,exam_date,daily_minutes').eq('id', subjectId).maybeSingle(),
      sb.from('topics').select('id,name,description,weight,position').eq('subject_id', subjectId).order('position'),
      sb.from('attempts').select('topic_id,quiz_id,correct,difficulty,created_at').eq('subject_id', subjectId).order('created_at').limit(5000),
      sb.from('chunks').select('topic_id,kind').eq('subject_id', subjectId).not('topic_id', 'is', null).limit(10000),
      sb.from('attempts').select('topic_id,questions(question,chunks(heading,page,documents(title)))').eq('subject_id', subjectId).eq('correct', false).order('created_at', { ascending: false }).limit(200),
    ]);
    if (!s.data) throw new HttpError(404, 'Subject not found.');

    const paper = new Map<string, number>(), material = new Map<string, number>();
    for (const r of c.data ?? []) {
      const bucket = r.kind === 'past_paper' ? paper : material;
      bucket.set(r.topic_id, (bucket.get(r.topic_id) ?? 0) + 1);
    }
    const maxPaper = Math.max(1, ...paper.values());
    const topics = (t.data ?? []).map((x: any) => ({
      id: x.id as string, name: x.name as string, description: x.description as string | null, weight: Number(x.weight),
      paperFreq: (paper.get(x.id) ?? 0) / maxPaper, chunkCount: material.get(x.id) ?? 0,
    }));
    const attempts: (Attempt & { quizId: string })[] = (a.data ?? []).map((r: any) => ({ topicId: r.topic_id, quizId: r.quiz_id, correct: r.correct, difficulty: r.difficulty, createdAt: r.created_at }));

    const gaps = computeGaps(topics, attempts);
    const plan = buildPlan(topics, gaps, { dailyMinutes: s.data.daily_minutes, examDate: s.data.exam_date });

    // History: the diagnosis "as of" the end of each quiz, so improvement is measured rather than asserted.
    const byQuiz = new Map<string, typeof attempts>();
    for (const x of attempts) byQuiz.set(x.quizId, [...(byQuiz.get(x.quizId) ?? []), x]);
    const history: HistoryPoint[] = [...byQuiz.entries()]
      .map(([quizId, list]) => ({ quizId, list, at: Math.max(...list.map((x) => new Date(x.createdAt).getTime())) }))
      .sort((x, y) => x.at - y.at)
      .map(({ quizId, list, at }) => {
        const asOf = computeGaps(topics, attempts, new Date(at));
        const correct = list.filter((x) => x.correct).length;
        return {
          quizId, at: new Date(at).toISOString(), answered: list.length, correct, accuracy: correct / list.length,
          overall: overallMastery(topics, asOf).mastery,
          topics: Object.fromEntries(asOf.map((g) => [g.topicId, g.mastery])),
        };
      });

    // Which source sections the student's mistakes came from.
    const revise: Record<string, ReviseSource[]> = {};
    for (const r of m.data ?? []) {
      const ch = (r as any).questions?.chunks;
      if (!ch) continue;
      const list = (revise[r.topic_id] ??= []);
      const title = ch.documents?.title ?? 'Your material';
      const hit = list.find((x) => x.title === title && x.heading === ch.heading && x.page === ch.page);
      if (hit) hit.count++; else list.push({ title, heading: ch.heading, page: ch.page, count: 1 });
    }
    for (const k of Object.keys(revise)) revise[k] = revise[k].sort((x, y) => y.count - x.count).slice(0, 4);

    const body: Diagnosis = {
      subject: s.data, topics, gaps, plan, overall: overallMastery(topics, gaps), history, revise,
      totals: { attempts: attempts.length },
    };
    return Response.json(body);
  } catch (e) { return fail(e); }
}
