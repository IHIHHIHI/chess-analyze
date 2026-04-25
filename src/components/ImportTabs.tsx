import { useState } from 'react';
import { ChessComImport } from './ChessComImport';
import { GameImport } from './GameImport';

type Tab = 'paste' | 'chesscom';

const TABS: { id: Tab; label: string }[] = [
  { id: 'chesscom', label: 'Chess.com' },
  { id: 'paste', label: 'Paste' },
];

export function ImportTabs() {
  const [tab, setTab] = useState<Tab>('chesscom');

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label="Game source"
        className="flex gap-1 rounded bg-slate-800 p-1"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? 'bg-slate-700 text-white shadow-inner'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {tab === 'paste' ? <GameImport /> : <ChessComImport />}
    </div>
  );
}
