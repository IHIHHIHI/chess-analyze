import type { PositionEval } from '../game/types';

const ENGINE_URL = '/stockfish/stockfish-nnue-16-single.js';

interface PendingEval {
  fen: string;
  depth: number;
  whiteToMove: boolean;
  resolve: (e: PositionEval) => void;
  reject: (err: Error) => void;
  lastInfo?: { cp?: number; mate?: number; pv: string[]; depth: number };
}

export class Engine {
  private worker: Worker;
  private ready: Promise<void>;
  private current: PendingEval | null = null;
  private terminated = false;

  constructor() {
    this.worker = new Worker(ENGINE_URL);
    this.worker.onmessage = (e) => this.onLine(String(e.data));
    this.worker.onerror = (e) => {
      if (this.current) {
        this.current.reject(new Error(`Engine error: ${e.message}`));
        this.current = null;
      }
    };
    this.ready = this.handshake();
  }

  private send(cmd: string) {
    if (!this.terminated) this.worker.postMessage(cmd);
  }

  private waitFor(predicate: (line: string) => boolean): Promise<void> {
    return new Promise((resolve) => {
      const handler = (e: MessageEvent) => {
        if (predicate(String(e.data))) {
          this.worker.removeEventListener('message', handler);
          resolve();
        }
      };
      this.worker.addEventListener('message', handler);
    });
  }

  private async handshake() {
    const uciOk = this.waitFor((l) => l === 'uciok');
    this.send('uci');
    await uciOk;
    const readyOk = this.waitFor((l) => l === 'readyok');
    this.send('setoption name MultiPV value 1');
    this.send('isready');
    await readyOk;
  }

  private onLine(line: string) {
    const cur = this.current;
    if (!cur) return;

    if (line.startsWith('info ')) {
      const info = parseInfo(line);
      if (info) cur.lastInfo = info;
      return;
    }

    if (line.startsWith('bestmove')) {
      const tokens = line.split(/\s+/);
      const bestMoveUci = tokens[1] && tokens[1] !== '(none)' ? tokens[1] : null;
      const li = cur.lastInfo;

      const cpRaw = li?.cp;
      const mateRaw = li?.mate;
      const result: PositionEval = {
        fen: cur.fen,
        depth: li?.depth ?? cur.depth,
        cp: cpRaw === undefined ? undefined : (cur.whiteToMove ? cpRaw : -cpRaw),
        mate: mateRaw === undefined ? undefined : (cur.whiteToMove ? mateRaw : -mateRaw),
        bestMoveUci,
        pv: li?.pv ?? (bestMoveUci ? [bestMoveUci] : []),
      };
      this.current = null;
      cur.resolve(result);
    }
  }

  async evaluate(fen: string, depth: number): Promise<PositionEval> {
    await this.ready;
    if (this.current) {
      throw new Error('Engine busy: serialize evaluate() calls');
    }
    if (this.terminated) {
      throw new Error('Engine terminated');
    }

    const whiteToMove = fen.split(' ')[1] === 'w';
    return new Promise<PositionEval>((resolve, reject) => {
      this.current = { fen, depth, whiteToMove, resolve, reject };
      this.send('ucinewgame');
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);
    });
  }

  // Cancel the in-flight evaluate(): rejects the pending promise, asks the
  // engine to stop, and waits for it to drain so the next evaluate() starts
  // from a clean state. Safe to call when nothing is pending.
  async abortCurrent(): Promise<void> {
    if (this.terminated || !this.current) return;
    const cur = this.current;
    this.current = null;
    cur.reject(new Error('Engine evaluation cancelled'));
    const drained = this.waitFor((l) => l === 'readyok');
    this.send('stop');
    this.send('isready');
    await drained;
  }

  terminate() {
    this.terminated = true;
    try {
      this.send('stop');
      this.worker.terminate();
    } catch {
      // ignore
    }
    if (this.current) {
      this.current.reject(new Error('Engine terminated'));
      this.current = null;
    }
  }
}

function parseInfo(line: string): { cp?: number; mate?: number; pv: string[]; depth: number } | null {
  const tokens = line.split(/\s+/);
  let cp: number | undefined;
  let mate: number | undefined;
  let depth = 0;
  let pv: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === 'depth') {
      depth = Number(tokens[i + 1]) || 0;
    } else if (t === 'score') {
      const kind = tokens[i + 1];
      const val = Number(tokens[i + 2]);
      if (kind === 'cp' && Number.isFinite(val)) cp = val;
      else if (kind === 'mate' && Number.isFinite(val)) mate = val;
    } else if (t === 'pv') {
      pv = tokens.slice(i + 1);
      break;
    }
  }

  if (cp === undefined && mate === undefined) return null;
  return { cp, mate, pv, depth };
}
