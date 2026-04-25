import type { Category } from '../game/types';

const STYLES: Record<Category, { bg: string; label: string; symbol: string }> = {
  best: { bg: 'bg-cls-best', label: 'Best', symbol: '★' },
  excellent: { bg: 'bg-cls-excellent', label: 'Excellent', symbol: '✓' },
  good: { bg: 'bg-cls-good', label: 'Good', symbol: '·' },
  inaccuracy: { bg: 'bg-cls-inaccuracy', label: 'Inaccuracy', symbol: '?!' },
  mistake: { bg: 'bg-cls-mistake', label: 'Mistake', symbol: '?' },
  blunder: { bg: 'bg-cls-blunder', label: 'Blunder', symbol: '??' },
};

interface Props {
  category: Category;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function ClassificationBadge({ category, size = 'sm', showLabel = false }: Props) {
  const s = STYLES[category];
  const dim = size === 'sm' ? 'h-4 min-w-[1rem] px-1 text-[10px]' : 'h-6 min-w-[1.5rem] px-2 text-xs';
  return (
    <span
      className={`inline-flex items-center justify-center rounded ${dim} ${s.bg} font-bold text-slate-900`}
      title={s.label}
    >
      {showLabel ? s.label : s.symbol}
    </span>
  );
}

export function categoryColor(category: Category): string {
  return {
    best: '#81b64c',
    excellent: '#7ab2e8',
    good: '#95a5a6',
    inaccuracy: '#f7c645',
    mistake: '#ff9a4d',
    blunder: '#fa412d',
  }[category];
}
