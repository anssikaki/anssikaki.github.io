import { decode, encode } from "../model/geo";
import type { Move } from "./moves";
import { MOVES_8 } from "./moves";
import { isMoveFeasible } from "./feasible";

export type RouteResult = {
  ok: boolean;
  arrivalT: number | null;
  path: { t: number; i: number; j: number }[];
};

export function solveDP(startId: number, targetId: number, nx: number, ny: number, tMax: number): RouteResult {
  const nCells = nx * ny;
  const reachable: boolean[][] = Array.from({ length: tMax + 1 }, () => Array(nCells).fill(false));
  const prev: number[][] = Array.from({ length: tMax + 1 }, () => Array(nCells).fill(-1));

  reachable[0][startId] = true;

  for (let t = 0; t < tMax; t++) {
    for (let cellId = 0; cellId < nCells; cellId++) {
      if (!reachable[t][cellId]) continue;
      const { i, j } = decode(cellId, nx);

      for (const mv of MOVES_8 as Move[]) {
        const ni = i + mv.di;
        const nj = j + mv.dj;
        if (ni < 0 || nj < 0 || ni >= nx || nj >= ny) continue;

        if (!isMoveFeasible(t, i, j, mv, nx, ny)) continue;

        const nid = encode(ni, nj, nx);
        if (!reachable[t + 1][nid]) {
          reachable[t + 1][nid] = true;
          prev[t + 1][nid] = cellId;
        }
      }
    }
  }

  let arrivalT: number | null = null;
  for (let t = 0; t <= tMax; t++) {
    if (reachable[t][targetId]) {
      arrivalT = t;
      break;
    }
  }
  if (arrivalT === null) return { ok: false, arrivalT: null, path: [] };

  // reconstruct
  const path: { t: number; i: number; j: number }[] = [];
  let cur = targetId;
  for (let t = arrivalT; t >= 0; t--) {
    const { i, j } = decode(cur, nx);
    path.push({ t, i, j });
    if (cur === startId) break;
    cur = prev[t][cur];
    if (cur < 0) break;
  }
  path.reverse();

  return { ok: true, arrivalT, path };
}
