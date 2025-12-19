import { cellCenterLatLon, decode, distKm, encode } from "../model/geo";
import { isMoveFeasible } from "./feasible";
import { MOVES_8 } from "./moves";

export type RouteResult = {
  ok: boolean;
  arrivalT: number | null;
  path: { t: number; i: number; j: number }[];
};

export function solveGreedy(startId: number, targetId: number, nx: number, ny: number, tMax: number): RouteResult {
  const targetCell = decode(targetId, nx);
  const targetLL = cellCenterLatLon(targetCell.i, targetCell.j);

  const path: { t: number; i: number; j: number }[] = [];

  let curId = startId;
  for (let t = 0; t <= tMax; t++) {
    const curCell = decode(curId, nx);
    path.push({ t, i: curCell.i, j: curCell.j });
    if (curId === targetId) return { ok: true, arrivalT: t, path };

    if (t === tMax) break;

    const curLL = cellCenterLatLon(curCell.i, curCell.j);

    let bestNid: number | null = null;
    let bestDist = Infinity;

    for (const mv of MOVES_8) {
      const ni = curCell.i + mv.di;
      const nj = curCell.j + mv.dj;
      if (ni < 0 || nj < 0 || ni >= nx || nj >= ny) continue;
      if (!isMoveFeasible(t, curCell.i, curCell.j, mv, nx, ny)) continue;

      const nLL = cellCenterLatLon(ni, nj);
      const d = distKm(nLL, targetLL);
      if (d < bestDist) {
        bestDist = d;
        bestNid = encode(ni, nj, nx);
      }
    }

    if (bestNid === null) return { ok: false, arrivalT: null, path };
    curId = bestNid;
    // (optional) stop if we somehow loop: ignore for now
    void curLL;
  }

  return { ok: false, arrivalT: null, path };
}
