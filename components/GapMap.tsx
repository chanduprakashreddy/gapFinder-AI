'use client';
import type { Rating, TopicGap } from '@/lib/gap';
import { pct } from './ui';

const TILE: Record<Rating, string> = {
  weak: 'bg-weak text-white',
  medium: 'bg-medium text-ink',
  strong: 'bg-strong text-white',
  untested: 'hatch text-ink border border-line',
};

/** Tile size follows syllabus weight; colour follows mastery. Hatched tiles have not been rated yet. */
export default function GapMap({ gaps, weights, selected, onSelect }: {
  gaps: TopicGap[]; weights: Record<string, number>; selected: string | null; onSelect: (id: string) => void;
}) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Topic map, sized by syllabus weight and coloured by mastery">
      {gaps.map((g) => (
        <li key={g.topicId} style={{ flexGrow: Math.max(1, weights[g.topicId] ?? 1), flexBasis: '9.5rem' }}>
          <button
            onClick={() => onSelect(g.topicId)} aria-pressed={selected === g.topicId}
            className={`flex h-full min-h-[8.5rem] w-full flex-col justify-between rounded-md p-3 text-left ${TILE[g.rating]} ${selected === g.topicId ? 'ring-4 ring-ink ring-offset-2' : ''}`}
          >
            <span className="text-base font-semibold leading-tight">{g.name}</span>
            <span>
              <span className="block text-3xl font-bold leading-none">{pct(g.mastery)}</span>
              <span className="text-xs opacity-90">{g.attempts === 0 ? 'not answered yet' : `${g.attempts} answered`}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
