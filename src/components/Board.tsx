import { useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Square } from 'react-chessboard/dist/chessboard/types';
import { useStore } from '../state/store';
import { STARTING_FEN } from '../game/pgn';

export function Board() {
  const game = useStore((s) => s.game);
  const ply = useStore((s) => s.ply);
  const orientation = useStore((s) => s.orientation);
  const analyses = useStore((s) => s.analyses);

  const fen = game?.positions[ply] ?? STARTING_FEN;
  const eval_ = analyses[ply] ?? null;

  const arrows = useMemo(() => {
    const uci = eval_?.bestMoveUci;
    if (!uci || uci.length < 4) return [];
    const from = uci.slice(0, 2) as Square;
    const to = uci.slice(2, 4) as Square;
    return [[from, to, 'rgb(129,182,76)'] as [Square, Square, string]];
  }, [eval_]);

  return (
    <div className="aspect-square w-full max-w-[640px]">
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        arePiecesDraggable={false}
        customArrows={arrows}
        customBoardStyle={{
          borderRadius: '6px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
        customDarkSquareStyle={{ backgroundColor: '#769656' }}
        customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
      />
    </div>
  );
}
