import { angleDiff180 } from "../model/geo";
import { boatSpeedKnots } from "../model/polar";
import { windAt } from "../model/wind";
import { CELL_KM } from "../model/constants";
import type { Move } from "./moves";

export function isMoveFeasible(t: number, i: number, j: number, move: Move, nx: number, ny: number): boolean {
  const w = windAt(t, i, j, nx, ny);

  // wind is "from"; convert to "to"
  const windToDeg = (w.dirFromDeg + 180) % 360;

  const twa = angleDiff180(move.headingDeg, windToDeg);
  const vKnots = boatSpeedKnots(w.speedMS, twa);
  if (vKnots <= 0) return false;

  const vKmh = vKnots * 1.852;
  const dMax = vKmh * 1.0; // 1 hour

  const dReq = move.isDiagonal ? CELL_KM * Math.SQRT2 : CELL_KM;
  return dMax >= dReq;
}
