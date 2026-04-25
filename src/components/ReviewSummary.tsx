import { useMemo } from 'react';
import { useStore } from '../state/store';
import type { Category, Color } from '../game/types';
import { ClassificationBadge } from './ClassificationBadge';

const CATEGORIES: Category[] = ['best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder'];

export function ReviewSummary() {
  const game = useStore((s) => s.game);
  const classifications = useStore((s) => s.classifications);
  const status = useStore((s) => s.status);
  const progress = useStore((s) => s.progress);

  const stats = useMemo(() => {
    const empty = { accuracy: 0, count: 0, byCategory: {} as Record<Category, number> };
    const init = (): typeof empty => ({
      accuracy: 0,
      count: 0,
      byCategory: { best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
    });
    const result: Record<Color, ReturnType<typeof init>> = { w: init(), b: init() };
    const totals: Record<Color, number> = { w: 0, b: 0 };

    if (!game) return result;

    classifications.forEach((c, i) => {
      if (!c) return;
      const color = game.moves[i].color;
      result[color].byCategory[c.category]++;
      totals[color] += c.accuracy;
      result[color].count++;
    });

    (['w', 'b'] as Color[]).forEach((c) => {
      result[c].accuracy = result[c].count > 0 ? totals[c] / result[c].count : 0;
    });

    return result;
  }, [game, classifications]);

  if (!game) return null;
  if (game.moves.length === 0) {
    return (
      <div className="rounded bg-slate-800 p-3 text-sm text-slate-300">
        Position-only analysis (no moves to score).
      </div>
    );
  }

  const showProgress = status === 'analyzing';
  const progressPct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  const Side = ({ color, name }: { color: Color; name: string }) => (
    <div className="flex-1 rounded bg-slate-800 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-slate-200">{name}</span>
        <span className="font-mono text-2xl text-slate-100">
          {stats[color].count > 0 ? stats[color].accuracy.toFixed(1) : '—'}
          <span className="text-sm text-slate-400">%</span>
        </span>
      </div>
      <ul className="space-y-1 text-xs">
        {CATEGORIES.map((cat) => (
          <li key={cat} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ClassificationBadge category={cat} />
              <span className="capitalize text-slate-300">{cat}</span>
            </span>
            <span className="font-mono text-slate-200">{stats[color].byCategory[cat]}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="space-y-3">
      {showProgress && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>Analyzing…</span>
            <span>
              {progress.done} / {progress.total}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded bg-slate-800">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}
      <div className="flex gap-3">
        <Side color="w" name="White" />
        <Side color="b" name="Black" />
      </div>
    </div>
  );
}
