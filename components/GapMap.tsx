'use client';
import type { Rating, TopicGap } from '@/lib/gap';
import { pct } from './ui';

const TILE: Record<Rating, { bg: string; ring: string }> = {
  weak: { bg: 'bg-weak/15 border-weak/30 hover:border-weak/50', ring: 'ring-weak/50' },
  medium: { bg: 'bg-medium/15 border-medium/30 hover:border-medium/50', ring: 'ring-medium/50' },
  strong: { bg: 'bg-strong/15 border-strong/30 hover:border-strong/50', ring: 'ring-strong/50' },
  untested: { bg: 'hatch border-line hover:border-muted/30', ring: 'ring-muted/50' },
};

const DOT: Record<Rating, string> = {
  weak: 'bg-weak',
  medium: 'bg-medium',
  strong: 'bg-strong',
  untested: 'bg-untested',
};

/** Tile size follows syllabus weight; colour follows mastery. Hatched tiles have not been rated yet. */
export default function GapMap({ gaps, weights, selected, onSelect }: {
  gaps: TopicGap[]; weights: Record<string, number>; selected: string | null; onSelect: (id: string) => void;
}) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Topic map, sized by syllabus weight and coloured by mastery">
      {gaps.map((g, idx) => (
        <li key={g.topicId} style={{ flexGrow: Math.max(1, weights[g.topicId] ?? 1), flexBasis: '10rem', animationDelay: `${idx * 50}ms` }} className="animate-in">
          <button
            onClick={() => onSelect(g.topicId)} aria-pressed={selected === g.topicId}
            className={`stat-card flex h-full min-h-[9rem] w-full flex-col justify-between rounded-xl border p-4 text-left transition-all ${TILE[g.rating].bg} ${selected === g.topicId ? `ring-2 ${TILE[g.rating].ring} shadow-glow` : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold leading-tight text-ink">{g.name}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {weights[g.topicId] !== undefined && (
                  <span className="rounded bg-surface/70 px-1.5 py-0.5 text-[10px] font-bold text-muted border border-line">
                    {weights[g.topicId]} pts
                  </span>
                )}
                <span className={`h-2.5 w-2.5 rounded-full ${DOT[g.rating]}`} />
              </div>
            </div>
            <div>
              <span className="block text-3xl font-bold leading-none text-ink">{pct(g.mastery)}</span>
              <span className="mt-1 block text-xs text-muted">{g.attempts === 0 ? 'Not answered yet' : `${g.attempts} answered`}</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
