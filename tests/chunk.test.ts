import { describe, it, expect } from 'vitest';
import { chunkPages, chunkQuestions, windows, headingInfo } from '../lib/chunk';

describe('headingInfo', () => {
  it('detects markdown, numbered and chapter headings but not sentences', () => {
    expect(headingInfo('## Calvin cycle')).toEqual({ text: 'Calvin cycle', level: 2 });
    expect(headingInfo('2.1 Light reactions')?.level).toBe(2);
    expect(headingInfo('Chapter 3: Genetics')?.level).toBe(1);
    expect(headingInfo('Rubisco fixes carbon dioxide in the stroma.')).toBeNull();
  });
});

describe('windows', () => {
  it('keeps chunks under size and overlaps neighbours', () => {
    const text = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} says something useful.`).join(' ');
    const w = windows(text, 300, 60);
    expect(w.length).toBeGreaterThan(3);
    expect(Math.max(...w.map((x) => x.length))).toBeLessThanOrEqual(300);
    expect(w[1].slice(0, 30)).toBeTruthy();
    expect(text.includes(w[0].slice(-40))).toBe(true);
  });
});

describe('chunkPages', () => {
  it('builds heading paths and records the page', () => {
    const body = 'Light is absorbed by chlorophyll in the thylakoid membranes of the chloroplast.';
    const out = chunkPages([
      { page: 1, text: `# Photosynthesis\n## Light reactions\n${body}\n` },
      { page: 2, text: `## Calvin cycle\n${body}\n` },
    ]);
    expect(out.map((c) => c.heading)).toEqual(['Photosynthesis › Light reactions', 'Photosynthesis › Calvin cycle']);
    expect(out[1].page).toBe(2);
  });
});

describe('chunkQuestions', () => {
  it('makes one chunk per numbered question', () => {
    const out = chunkQuestions([{ page: 1, text: '1. State the function of the nucleus in a cell. [2]\n2. Explain how the Calvin cycle fixes carbon dioxide. [4]\n' }]);
    expect(out).toHaveLength(2);
    expect(out[1].heading).toBe('Past paper question 2');
  });
});
