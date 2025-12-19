import { NO_GO_TWA_DEG } from "./constants";

const POLAR_TWA = [45, 60, 75, 90, 120, 150, 180] as const;
const POLAR_TWS = [6, 8, 10, 12] as const;

// knots [twsIdx][twaIdx]
const POLAR_SPEED = [
  [4.2, 4.9, 5.4, 5.6, 5.4, 4.6, 4.0],
  [5.2, 6.1, 6.7, 7.0, 6.8, 5.8, 5.0],
  [6.0, 7.0, 7.8, 8.2, 8.0, 6.8, 5.8],
  [6.5, 7.7, 8.6, 9.1, 8.8, 7.3, 6.2]
] as const;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a: number, b: number, u: number) {
  return a + (b - a) * u;
}

function findBracket(arr: readonly number[], x: number): { i0: number; i1: number; u: number } {
  if (x <= arr[0]) return { i0: 0, i1: 0, u: 0 };
  if (x >= arr[arr.length - 1]) return { i0: arr.length - 1, i1: arr.length - 1, u: 0 };
  for (let k = 0; k < arr.length - 1; k++) {
    const a = arr[k], b = arr[k + 1];
    if (x >= a && x <= b) {
      const u = (x - a) / (b - a);
      return { i0: k, i1: k + 1, u };
    }
  }
  return { i0: 0, i1: 0, u: 0 };
}

export function boatSpeedKnots(twsMS: number, twaDeg: number): number {
  // no-go
  if (twaDeg < NO_GO_TWA_DEG) return 0;

  // prototype: clamp tws to polar range
  const tws = clamp(twsMS, POLAR_TWS[0], POLAR_TWS[POLAR_TWS.length - 1]);
  const twa = clamp(twaDeg, POLAR_TWA[0], POLAR_TWA[POLAR_TWA.length - 1]);

  const btws = findBracket(POLAR_TWS, tws);
  const btwa = findBracket(POLAR_TWA, twa);

  const v00 = POLAR_SPEED[btws.i0][btwa.i0];
  const v01 = POLAR_SPEED[btws.i0][btwa.i1];
  const v10 = POLAR_SPEED[btws.i1][btwa.i0];
  const v11 = POLAR_SPEED[btws.i1][btwa.i1];

  const v0 = lerp(v00, v01, btwa.u);
  const v1 = lerp(v10, v11, btwa.u);
  return lerp(v0, v1, btws.u);
}
