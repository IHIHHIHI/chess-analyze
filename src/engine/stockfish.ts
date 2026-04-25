import type { PositionEval } from '../game/types';

const ENGINE_URL = '/stockfish/stockfish-nnue-16-single.js';

interface InfoLine {
  cp?: number;
  mate?: number;
  pv: string[];
  depth: number;
}

interface PendingEval {
  fen: string;
  depth: number;
  whiteToMove: boolean;
  multiPV: number;
  resolve: (e: PositionEval) => void;
  reject: (err: Error) => void;
  lastInfoByMpv: Map<number, InfoLine>;
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
    this.send('isready');
    await readyOk;
  }

  private onLine(line: string) {
    const cur = this.current;
    if (!cur) return;

    if (line.startsWith('info ')) {
      const info = parseInfo(line);
      if (info) {
        cur.lastInfoByMpv.set(info.mpv, {
          cp: info.cp,
          mate: info.mate,
          pv: info.pv,
          depth: info.depth,
        });
      }
      return;
    }

    if (line.startsWith('bestmove')) {
      const tokens = line.split(/\s+/);
      const bestMoveUci = tokens[1] && tokens[1] !== '(none)' ? tokens[1] : null;

      const sortedKeys = Array.from(cur.lastInfoByMpv.keys()).sort((a, b) => a - b);
      const lines = sortedKeys.map((mpv) => {
        const info = cur.lastInfoByMpv.get(mpv)!;
        return {
          cp: info.cp === undefined ? undefined : cur.whiteToMove ? info.cp : -info.cp,
          mate:
            info.mate === undefined ? undefined : cur.whiteToMove ? info.mate : -info.mate,
          pv: info.pv,
        };
      });

      const top = lines[0];
      const topInfo = cur.lastInfoByMpv.get(sortedKeys[0] ?? 1);
      const result: PositionEval = {
        fen: cur.fen,
        depth: topInfo?.depth ?? cur.depth,
        cp: top?.cp,
        mate: top?.mate,
        bestMoveUci,
        pv: top?.pv ?? (bestMoveUci ? [bestMoveUci] : []),
        lines,
      };
      this.current = null;
      cur.resolve(result);
    }
  }

  async evaluate(fen: string, depth: number, multiPV = 1): Promise<PositionEval> {
    await this.ready;
    if (this.current) {
      throw new Error('Engine busy: serialize evaluate() calls');
    }
    if (this.terminated) {
      throw new Error('Engine terminated');
    }

    const whiteToMove = fen.split(' ')[1] === 'w';
    return new Promise<PositionEval>((resolve, reject) => {
      this.current = {
        fen,
        depth,
        whiteToMove,
        multiPV,
        resolve,
        reject,
        lastInfoByMpv: new Map(),
      };
      this.send('ucinewgame');
      this.send(`setoption name MultiPV value ${multiPV}`);
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

function parseInfo(line: string): {
  mpv: number;
  cp?: number;
  mate?: number;
  pv: string[];
  depth: number;
} | null {
  const tokens = line.split(/\s+/);
  let cp: number | undefined;
  let mate: number | undefined;
  let depth = 0;
  let mpv = 1;
  let pv: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === 'depth') {
      depth = Number(tokens[i + 1]) || 0;
    } else if (t === 'multipv') {
      mpv = Number(tokens[i + 1]) || 1;
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
  return { mpv, cp, mate, pv, depth };
}
