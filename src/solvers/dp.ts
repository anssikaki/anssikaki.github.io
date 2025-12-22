import { decode, encode } from "../model/geo";
import type { Move } from "./moves";
import { MOVES_8 } from "./moves";
import { isMoveFeasible } from "./feasible";
import { CELL_KM } from "../model/constants";

export type RouteResult = {
  ok: boolean;
  arrivalT: number | null;
  path: { t: number; i: number; j: number }[];
  totalKm: number;
};

export function solveDP(startId: number, targetId: number, nx: number, ny: number, tMax: number): RouteResult {
  const nCells = nx * ny;

  // reachable[t][cell] is implied by dist[t][cell] < INF
  const INF = 1e18;
  const distKm: number[][] = Array.from({ length: tMax + 1 }, () => Array(nCells).fill(INF));
  const prev: number[][] = Array.from({ length: tMax + 1 }, () => Array(nCells).fill(-1));

  distKm[0][startId] = 0;

  for (let t = 0; t < tMax; t++) {
    for (let cellId = 0; cellId < nCells; cellId++) {
      const curDist = distKm[t][cellId];
      if (curDist >= INF) continue;

      const { i, j } = decode(cellId, nx);

      for (const mv of MOVES_8 as Move[]) {
        const ni = i + mv.di;
        const nj = j + mv.dj;
        if (ni < 0 || nj < 0 || ni >= nx || nj >= ny) continue;

        if (!isMoveFeasible(t, i, j, mv, nx, ny)) continue;

        const nid = encode(ni, nj, nx);
        const stepKm = mv.isDiagonal ? CELL_KM * Math.SQRT2 : CELL_KM;
        const cand = curDist + stepKm;

        // same arrival hour (t+1) but choose the shorter sailed distance path
        if (cand < distKm[t + 1][nid]) {
          distKm[t + 1][nid] = cand;
          prev[t + 1][nid] = cellId;
        }
      }
    }
  }

  // earliest arrival time
  let arrivalT: number | null = null;
  for (let t = 0; t <= tMax; t++) {
    if (distKm[t][targetId] < INF) {
      arrivalT = t;
      break;
    }
  }
  if (arrivalT === null) return { ok: false, arrivalT: null, path: [], totalKm: 0 };

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

  return { ok: true, arrivalT, path, totalKm: distKm[arrivalT][targetId] };
}
