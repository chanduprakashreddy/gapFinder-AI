// Diagnosis and planning. Pure code, no LLM: every number here can be audited and unit-tested.
export const TAU_DAYS = 14; // recency decay: weight = difficulty * e^(-age/14d)
export const WEAK_BELOW = 0.4;
export const MEDIUM_BELOW = 0.75;
export const MIN_ATTEMPTS = 3;
export const MIN_BLOCK_MINUTES = 10;

export type Rating = 'weak' | 'medium' | 'strong' | 'untested';
export type Attempt = { topicId: string; correct: boolean; difficulty: number; createdAt: string | number | Date };
export type TopicInfo = { id: string; name: string; weight: number; paperFreq?: number };
export type TopicGap = {
  topicId: string; name: string; rating: Rating; mastery: number | null;
  attempts: number; correct: number; reason: string;
};

const DAY = 86_400_000;
const pct = (x: number) => Math.round(x * 100);

export function rate(mastery: number | null, attempts: number): Rating {
  if (attempts < MIN_ATTEMPTS || mastery === null) return 'untested';
  if (mastery < WEAK_BELOW) return 'weak';
  if (mastery < MEDIUM_BELOW) return 'medium';
  return 'strong';
}

export function computeGaps(topics: TopicInfo[], attempts: Attempt[], now: Date = new Date()): TopicGap[] {
  const by = new Map<string, (Attempt & { t: number })[]>();
  for (const a of attempts) {
    const t = new Date(a.createdAt).getTime();
    if (t > now.getTime()) continue; // lets callers evaluate "as of" a past moment
    const list = by.get(a.topicId) ?? [];
    list.push({ ...a, t });
    by.set(a.topicId, list);
  }
  return topics.map((topic) => {
    const list = (by.get(topic.id) ?? []).sort((x, y) => x.t - y.t);
    const n = list.length;
    const c = list.filter((a) => a.correct).length;
    let num = 0, den = 0, hardN = 0, hardC = 0;
    for (const a of list) {
      const age = Math.max(0, (now.getTime() - a.t) / DAY);
      const w = a.difficulty * Math.exp(-age / TAU_DAYS);
      den += w;
      if (a.correct) num += w;
      if (a.difficulty >= 3) { hardN++; if (a.correct) hardC++; }
    }
    const mastery = den > 0 ? num / den : null;
    const rating = rate(mastery, n);

    let reason: string;
    if (n === 0) reason = 'No questions answered yet.';
    else if (n < MIN_ATTEMPTS) reason = `${c}/${n} correct so far. Answer ${MIN_ATTEMPTS - n} more to get a rating.`;
    else {
      const last = list.slice(-3);
      const lc = last.filter((a) => a.correct).length;
      reason = `${c}/${n} correct (${pct(mastery!)}% after weighting harder and more recent questions).`;
      if (hardN > 0) reason += ` Hard questions: ${hardC}/${hardN}.`;
      reason += ` Last ${last.length}: ${lc}/${last.length}.`;
    }
    return { topicId: topic.id, name: topic.name, rating, mastery, attempts: n, correct: c, reason };
  });
}

/** Weight-averaged mastery across topics that have at least one answer. */
export function overallMastery(topics: TopicInfo[], gaps: TopicGap[]): { mastery: number | null; coverage: number } {
  const w = new Map(topics.map((t) => [t.id, t.weight]));
  let num = 0, den = 0, tested = 0;
  for (const g of gaps) {
    if (g.mastery === null) continue;
    const tw = w.get(g.topicId) ?? 1;
    num += g.mastery * tw; den += tw; tested++;
  }
  return { mastery: den > 0 ? num / den : null, coverage: topics.length ? tested / topics.length : 0 };
}

/** priority = (1 - mastery) * syllabus weight * (1 + 0.5 * past-paper frequency). Unknown mastery counts as 0.5. */
export function priorityOf(topic: TopicInfo, gap: TopicGap): number {
  const m = gap.attempts > 0 && gap.mastery !== null ? gap.mastery : 0.5;
  return (1 - m) * topic.weight * (1 + 0.5 * (topic.paperFreq ?? 0));
}

export type PlanItem = {
  topicId: string; name: string; rating: Rating; mastery: number | null;
  priority: number; minutes: number; action: string;
};

const ACTIONS: Record<Rating, string> = {
  weak: 'Re-read the source sections below, then retake questions on this topic.',
  medium: 'Practise questions and fix the specific mistakes.',
  strong: 'Quick recap only; revisit once a week.',
  untested: 'Take a diagnostic quiz to find out where you stand.',
};

export function buildPlan(
  topics: TopicInfo[], gaps: TopicGap[],
  opts: { dailyMinutes: number; examDate?: string | null; today?: Date },
) {
  const gapBy = new Map(gaps.map((g) => [g.topicId, g]));
  const all: PlanItem[] = topics.map((t) => {
    const g = gapBy.get(t.id)!;
    return { topicId: t.id, name: t.name, rating: g.rating, mastery: g.mastery, priority: priorityOf(t, g), minutes: 0, action: ACTIONS[g.rating] };
  }).sort((a, b) => b.priority - a.priority);

  // Split daily minutes in proportion to priority; drop the smallest share until every block is at least MIN_BLOCK.
  let active = all.filter((i) => i.priority > 0);
  const min = Math.min(MIN_BLOCK_MINUTES, opts.dailyMinutes);
  for (;;) {
    const total = active.reduce((s, i) => s + i.priority, 0);
    if (!total) break;
    const shares = active.map((i) => (opts.dailyMinutes * i.priority) / total);
    if (active.length > 1 && Math.min(...shares) < min) { active = active.slice(0, -1); continue; }
    const mins = shares.map((s) => Math.round(s));
    mins[0] += opts.dailyMinutes - mins.reduce((s, m) => s + m, 0);
    active.forEach((i, k) => (i.minutes = Math.max(0, mins[k])));
    break;
  }
  const items = all.filter((i) => i.minutes > 0);
  const maintenance = all.filter((i) => i.minutes === 0);

  const today = opts.today ?? new Date();
  let daysLeft: number | null = null;
  if (opts.examDate) daysLeft = Math.max(0, Math.ceil((new Date(opts.examDate).getTime() - today.getTime()) / DAY));
  return { items, maintenance, daysLeft, totalMinutes: daysLeft === null ? null : daysLeft * opts.dailyMinutes };
}
