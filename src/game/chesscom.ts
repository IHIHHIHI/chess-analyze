export interface ChessComPlayer {
  username: string;
  rating: number;
  result: string;
  uuid?: string;
}

export interface ChessComGame {
  url: string;
  pgn: string;
  time_control: string;
  time_class: 'bullet' | 'blitz' | 'rapid' | 'daily';
  rated: boolean;
  end_time: number;
  rules: string;
  white: ChessComPlayer;
  black: ChessComPlayer;
  initial_setup?: string;
  eco?: string;
  uuid?: string;
}

const API_BASE = 'https://api.chess.com/pub';

class ChessComError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(`Network error reaching chess.com: ${(err as Error).message || 'fetch failed'}`);
  }
  if (!res.ok) {
    let msg = `Chess.com returned HTTP ${res.status}`;
    try {
      const body = (await res.clone().json()) as { message?: string };
      if (body && typeof body.message === 'string' && body.message.trim()) {
        msg = `Chess.com: ${body.message.trim()}`;
      }
    } catch {
      // body wasn't JSON; keep the generic message
    }
    throw new ChessComError(msg, res.status);
  }
  return res.json() as Promise<T>;
}

function sanitizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function fetchArchives(username: string): Promise<string[]> {
  const clean = sanitizeUsername(username);
  if (!clean) throw new Error('Provide a chess.com username');
  try {
    const data = await fetchJson<{ archives?: string[] }>(
      `${API_BASE}/player/${encodeURIComponent(clean)}/games/archives`,
    );
    return data.archives ?? [];
  } catch (err) {
    if (err instanceof ChessComError && err.status === 404) {
      throw new Error(`Player "${username}" not found on chess.com`);
    }
    throw err;
  }
}

export async function fetchArchive(url: string): Promise<ChessComGame[]> {
  const data = await fetchJson<{ games?: ChessComGame[] }>(url);
  return data.games ?? [];
}

export function archiveMonthLabel(url: string): string {
  const m = url.match(/\/(\d{4})\/(\d{2})(?:\/?)$/);
  if (!m) return url;
  const year = Number(m[1]);
  const month = Number(m[2]);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}
