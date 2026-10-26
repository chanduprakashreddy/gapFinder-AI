import { describe, it, expect } from 'vitest';
import { computeGaps, buildPlan, rate, overallMastery } from '../lib/gap';

const now = new Date('2026-01-31T00:00:00Z');
const topics = [
  { id: 'a', name: 'A', weight: 1 }, { id: 'b', name: 'B', weight: 1 }, { id: 'c', name: 'C', weight: 2 },
];
const att = (topicId: string, correct: boolean, difficulty = 2, daysAgo = 0) =>
  ({ topicId, correct, difficulty, createdAt: new Date(now.getTime() - daysAgo * 86_400_000) });

describe('rate', () => {
  it('uses thresholds and the minimum attempt count', () => {
    expect(rate(0.2, 5)).toBe('weak');
    expect(rate(0.4, 5)).toBe('medium');
    expect(rate(0.75, 5)).toBe('strong');
    expect(rate(1, 2)).toBe('untested');
  });
});

describe('computeGaps', () => {
  it('rates weak / strong and explains why', () => {
    const g = computeGaps(topics, [
      att('a', false), att('a', false), att('a', true),
      att('b', true), att('b', true), att('b', true),
    ], now);
    expect(g[0].rating).toBe('weak');
    expect(g[0].reason).toContain('1/3 correct');
    expect(g[1].rating).toBe('strong');
    expect(g[2].rating).toBe('untested');
  });
  it('weights harder questions more', () => {
    const easyWrong = computeGaps([topics[0]], [att('a', true, 3), att('a', true, 3), att('a', false, 1)], now)[0].mastery!;
    const hardWrong = computeGaps([topics[0]], [att('a', true, 1), att('a', true, 1), att('a', false, 3)], now)[0].mastery!;
    expect(easyWrong).toBeGreaterThan(hardWrong);
  });
  it('lets old mistakes fade', () => {
    const g = computeGaps([topics[0]], [att('a', false, 2, 60), att('a', false, 2, 60), att('a', true, 2, 0), att('a', true, 2, 0)], now)[0];
    expect(g.mastery!).toBeGreaterThan(0.9);
  });
  it('ignores attempts after "now"', () => {
    const g = computeGaps([topics[0]], [{ ...att('a', true), createdAt: new Date(now.getTime() + 1000) }], now)[0];
    expect(g.attempts).toBe(0);
  });
});

describe('buildPlan', () => {
  it('splits minutes by priority and sums to the daily budget', () => {
    const heavy = [topics[0], topics[1], { id: 'c', name: 'C', weight: 3 }];
    const gaps = computeGaps(heavy, [
      att('a', false), att('a', false), att('a', false),
      att('b', true), att('b', true), att('b', true),
    ], now);
    const plan = buildPlan(heavy, gaps, { dailyMinutes: 60, examDate: '2026-02-10', today: now });
    expect(plan.items.reduce((s, i) => s + i.minutes, 0)).toBe(60);
    expect(plan.items[0].name).toBe('C'); // heavy weight, unknown mastery beats the strong topic
    const minutes = (n: string) => plan.items.find((i) => i.name === n)?.minutes ?? 0;
    expect(minutes('A')).toBeGreaterThan(minutes('B'));
    expect(plan.daysLeft).toBe(10);
  });
  it('boosts topics that appear often in past papers', () => {
    const t = [{ id: 'x', name: 'X', weight: 1, paperFreq: 1 }, { id: 'y', name: 'Y', weight: 1, paperFreq: 0 }];
    const plan = buildPlan(t, computeGaps(t, [], now), { dailyMinutes: 60 });
    expect(plan.items[0].name).toBe('X');
  });
  it('drops slivers below the minimum block', () => {
    const t = [{ id: 'x', name: 'X', weight: 100 }, { id: 'y', name: 'Y', weight: 1 }];
    const plan = buildPlan(t, computeGaps(t, [], now), { dailyMinutes: 30 });
    expect(plan.items).toHaveLength(1);
    expect(plan.maintenance[0].name).toBe('Y');
  });
});

describe('overallMastery', () => {
  it('averages tested topics by weight', () => {
    const gaps = computeGaps(topics, [att('a', true), att('c', false)], now);
    const o = overallMastery(topics, gaps);
    expect(o.mastery).toBeCloseTo(1 / 3, 5);
    expect(o.coverage).toBeCloseTo(2 / 3, 5);
  });
});
