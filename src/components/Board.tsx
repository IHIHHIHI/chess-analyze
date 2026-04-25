import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import type { Piece, PromotionPieceOption, Square } from 'react-chessboard/dist/chessboard/types';
import { useStore } from '../state/store';
import { STARTING_FEN } from '../game/pgn';
import type { PositionEval } from '../game/types';

type SquareStyle = Record<string, string | number>;

const SELECTED_STYLE: SquareStyle = { background: 'rgba(255, 235, 59, 0.5)' };
const MOVE_DOT_STYLE: SquareStyle = {
  background:
    'radial-gradient(circle, rgba(20,30,20,0.35) 22%, transparent 25%)',
  borderRadius: '50%',
};
const CAPTURE_RING_STYLE: SquareStyle = {
  background:
    'radial-gradient(circle, transparent 58%, rgba(20,30,20,0.40) 60%, transparent 75%)',
};

export function Board() {
  const game = useStore((s) => s.game);
  const ply = useStore((s) => s.ply);
  const orientation = useStore((s) => s.orientation);
  const analyses = useStore((s) => s.analyses);
  const exploration = useStore((s) => s.exploration);
  const tryUserMove = useStore((s) => s.tryUserMove);

  const [selected, setSelected] = useState<Square | null>(null);

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

  // Drop selection whenever the displayed position changes.
  useEffect(() => {
    setSelected(null);
  }, [fen]);

  const sideToMove = fen.split(' ')[1] as 'w' | 'b';

  const legalTargets = useMemo(() => {
    const result = new Map<Square, boolean>();
    if (!selected || !game) return result;
    const chess = new Chess();
    try {
      chess.load(fen);
    } catch {
      return result;
    }
    const moves = chess.moves({ square: selected, verbose: true }) as Array<{
      to: Square;
      captured?: string;
      flags?: string;
    }>;
    moves.forEach((m) => {
      const isCapture = m.captured !== undefined || (m.flags?.includes('e') ?? false);
      result.set(m.to, isCapture);
    });
    return result;
  }, [selected, fen, game]);

  const squareStyles = useMemo(() => {
    const styles: { [key: string]: SquareStyle } = {};
    if (selected) styles[selected] = { ...SELECTED_STYLE };
    for (const [sq, isCapture] of legalTargets.entries()) {
      styles[sq] = isCapture ? { ...CAPTURE_RING_STYLE } : { ...MOVE_DOT_STYLE };
    }
    return styles;
  }, [selected, legalTargets]);

  const arrows = useMemo(() => {
    const uci = evalSrc?.bestMoveUci;
    if (!uci || uci.length < 4) return [];
    const from = uci.slice(0, 2) as Square;
    const to = uci.slice(2, 4) as Square;
    return [[from, to, 'rgb(129,182,76)'] as [Square, Square, string]];
  }, [evalSrc]);

  const draggable = !!game;

  const onDrop = (sourceSquare: Square, targetSquare: Square, _piece: Piece) => {
    setSelected(null);
    return tryUserMove({ from: sourceSquare, to: targetSquare });
  };

  const onPromotion = (
    piece: PromotionPieceOption | undefined,
    from: Square | undefined,
    to: Square | undefined,
  ) => {
    setSelected(null);
    if (!piece || !from || !to) return false;
    return tryUserMove({ from, to, promotion: piece[1].toLowerCase() });
  };

  const onSquareClick = (sq: Square, piece: Piece | undefined) => {
    if (!game) return;

    if (selected) {
      if (sq === selected) {
        setSelected(null);
        return;
      }
      if (legalTargets.has(sq)) {
        // Auto-promote to queen for click-to-move; drag-and-drop still surfaces the
        // promotion dialog for users who want to underpromote.
        let promotion: string | undefined;
        const c = new Chess();
        try {
          c.load(fen);
          const fromPiece = c.get(selected);
          if (fromPiece?.type === 'p' && (sq[1] === '1' || sq[1] === '8')) {
            promotion = 'q';
          }
        } catch {
          // ignore
        }
        tryUserMove({ from: selected, to: sq, promotion });
        setSelected(null);
        return;
      }
      if (piece && piece[0] === sideToMove) {
        setSelected(sq);
        return;
      }
      setSelected(null);
      return;
    }

    if (piece && piece[0] === sideToMove) {
      setSelected(sq);
    }
  };

  return (
    <div className="aspect-square w-full max-w-[640px]">
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        arePiecesDraggable={draggable}
        onPieceDrop={onDrop}
        onPromotionPieceSelect={onPromotion}
        onSquareClick={onSquareClick}
        customArrows={arrows}
        customSquareStyles={squareStyles}
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
