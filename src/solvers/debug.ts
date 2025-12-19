import { decode } from "../model/geo";
import { windAt } from "../model/wind";
import { angleDiff180 } from "../model/geo";
import { boatSpeedKnots } from "../model/polar";
import { CELL_KM, T_MAX } from "../model/constants";
import { MOVES_8 } from "./moves";
import { isMoveFeasible } from "./feasible";

export type DebugStats = {
  nx: number;
  ny: number;
  start: { i: number; j: number };
  target: { i: number; j: number };
  // per hour
  reachableCounts: number[];
  // from start cell at t=0
  startFeasibleMovesAtT0: {
    headingDeg: number;
    twaDeg: number;
    windSpeedMS: number;
    windFromDeg: number;
    boatKnots: number;
    reqKm: number;
    maxKm: number;
    feasible: boolean;
  }[];
  // summary
  anyReachable: boolean;
};

export function computeDebugStats(
  nx: number,
  ny: number,
  startId: number,
  targetId: number
): DebugStats {
  const nCells = nx * ny;
  const start = decode(startId, nx);
  const target = decode(targetId, nx);

  // DP reachability counts (same feasibility logic as solver)
  const reachable: boolean[][] = Array.from({ length: T_MAX + 1 }, () => Array(nCells).fill(false));
  reachable[0][startId] = true;

  const reachableCounts: number[] = [];
  reachableCounts.push(1);

  for (let t = 0; t < T_MAX; t++) {
    for (let cellId = 0; cellId < nCells; cellId++) {
      if (!reachable[t][cellId]) continue;
      const c = decode(cellId, nx);

      for (const mv of MOVES_8) {
        const ni = c.i + mv.di;
        const nj = c.j + mv.dj;
        if (ni < 0 || nj < 0 || ni >= nx || nj >= ny) continue;
        if (!isMoveFeasible(t, c.i, c.j, mv, nx, ny)) continue;

        const nid = nj * nx + ni;
        reachable[t + 1][nid] = true;
      }
    }
    reachableCounts.push(reachable[t + 1].filter(Boolean).length);
  }

  // Look at feasibility from the start at t=0 (helpful diagnosis)
  const w0 = windAt(0, start.i, start.j, nx, ny);
  const windToDeg = (w0.dirFromDeg + 180) % 360;

  const startFeasibleMovesAtT0 = MOVES_8.map((mv) => {
    const twaDeg = angleDiff180(mv.headingDeg, windToDeg);
    const boatKnots = boatSpeedKnots(w0.speedMS, twaDeg);
    const maxKm = boatKnots * 1.852 * 1.0; // 1 hour
    const reqKm = mv.isDiagonal ? CELL_KM * Math.SQRT2 : CELL_KM;
    const feasible = boatKnots > 0 && maxKm >= reqKm;
    return {
      headingDeg: mv.headingDeg,
      twaDeg,
      windSpeedMS: w0.speedMS,
      windFromDeg: w0.dirFromDeg,
      boatKnots,
      reqKm,
      maxKm,
      feasible,
    };
  });

  return {
    nx,
    ny,
    start,
    target,
    reachableCounts,
    startFeasibleMovesAtT0,
    anyReachable: reachableCounts.some((c) => c > 0),
  };
}
