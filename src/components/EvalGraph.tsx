import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStore } from '../state/store';
import { evalToCp } from '../engine/classify';

export function EvalGraph() {
  const game = useStore((s) => s.game);
  const analyses = useStore((s) => s.analyses);
  const ply = useStore((s) => s.ply);
  const setPly = useStore((s) => s.setPly);

  const data = useMemo(
    () =>
      analyses.map((e, i) => {
        const cp = e ? evalToCp(e) : 0;
        const clamped = Math.max(-1000, Math.min(1000, cp));
        return { ply: i, eval: clamped / 100, hasEval: !!e };
      }),
    [analyses],
  );

  if (!game || data.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center rounded bg-slate-800 text-sm text-slate-500">
        No evaluation graph yet.
      </div>
    );
  }

  return (
    <div className="h-40 w-full rounded bg-slate-800 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 6, right: 6, bottom: 0, left: 0 }}
          onClick={(e) => {
            const lbl = e?.activeLabel;
            if (typeof lbl === 'number') setPly(lbl);
          }}
        >
          <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
          <XAxis dataKey="ply" stroke="#64748b" fontSize={10} />
          <YAxis domain={[-10, 10]} stroke="#64748b" fontSize={10} width={28} />
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', fontSize: 12 }}
            labelFormatter={(l) => `Ply ${l}`}
            formatter={(v: number) => [v.toFixed(2), 'Eval']}
          />
          <ReferenceLine y={0} stroke="#64748b" />
          <ReferenceLine x={ply} stroke="#facc15" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="eval"
            stroke="#e2e8f0"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
