import { useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Piece, PromotionPieceOption, Square } from 'react-chessboard/dist/chessboard/types';
import { useStore } from '../state/store';
import { STARTING_FEN } from '../game/pgn';
import type { PositionEval } from '../game/types';

export function Board() {
  const game = useStore((s) => s.game);
  const ply = useStore((s) => s.ply);
  const orientation = useStore((s) => s.orientation);
  const analyses = useStore((s) => s.analyses);
  const exploration = useStore((s) => s.exploration);
  const tryUserMove = useStore((s) => s.tryUserMove);

  let fen: string;
  let evalSrc: PositionEval | null;
  if (!game) {
    fen = STARTING_FEN;
    evalSrc = null;
  } else if (exploration && exploration.line.length > 0) {
    const tipIdx = exploration.line.length - 1;
    fen = exploration.line[tipIdx].fenAfter;
    evalSrc = exploration.analyses[tipIdx] ?? null;
  } else if (exploration) {
    fen = game.positions[exploration.rootPly];
    evalSrc = analyses[exploration.rootPly] ?? null;
  } else {
    fen = game.positions[ply];
    evalSrc = analyses[ply] ?? null;
  }

  const arrows = useMemo(() => {
    const uci = evalSrc?.bestMoveUci;
    if (!uci || uci.length < 4) return [];
    const from = uci.slice(0, 2) as Square;
    const to = uci.slice(2, 4) as Square;
    return [[from, to, 'rgb(129,182,76)'] as [Square, Square, string]];
  }, [evalSrc]);

  const draggable = !!game;

  const onDrop = (sourceSquare: Square, targetSquare: Square, _piece: Piece) =>
    tryUserMove({ from: sourceSquare, to: targetSquare });

  const onPromotion = (
    piece: PromotionPieceOption | undefined,
    from: Square | undefined,
    to: Square | undefined,
  ) => {
    if (!piece || !from || !to) return false;
    return tryUserMove({ from, to, promotion: piece[1].toLowerCase() });
  };

  return (
    <div className="aspect-square w-full max-w-[640px]">
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        arePiecesDraggable={draggable}
        onPieceDrop={onDrop}
        onPromotionPieceSelect={onPromotion}
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
