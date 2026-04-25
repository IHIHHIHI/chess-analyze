import { useStore } from '../state/store';

export function Controls() {
  const first = useStore((s) => s.first);
  const prev = useStore((s) => s.prev);
  const next = useStore((s) => s.next);
  const last = useStore((s) => s.last);
  const flip = useStore((s) => s.flip);
  const game = useStore((s) => s.game);
  const ply = useStore((s) => s.ply);

  const total = game ? game.positions.length - 1 : 0;
  const disabled = !game;

  const Btn = ({ onClick, label, sym }: { onClick: () => void; label: string; sym: string }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="rounded bg-slate-700 px-3 py-2 text-sm text-slate-100 hover:bg-slate-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
    >
      {sym}
    </button>
  );

  return (
    <div className="flex items-center justify-center gap-2 py-3">
      <Btn onClick={first} label="First" sym="«" />
      <Btn onClick={prev} label="Previous" sym="‹" />
      <span className="min-w-[5rem] text-center font-mono text-sm text-slate-300">
        {game ? `${ply} / ${total}` : '— / —'}
      </span>
      <Btn onClick={next} label="Next" sym="›" />
      <Btn onClick={last} label="Last" sym="»" />
      <span className="mx-2 text-slate-600">|</span>
      <Btn onClick={flip} label="Flip board" sym="⇅" />
    </div>
  );
}
