import { clamp, wrap360 } from "./geo";

const BASE_WIND = [
  { dirFromDeg: 80, speedMS: 7.0 },
  { dirFromDeg: 95, speedMS: 7.5 },
  { dirFromDeg: 110, speedMS: 8.0 },
  { dirFromDeg: 130, speedMS: 9.0 },
  { dirFromDeg: 150, speedMS: 10.0 },
  { dirFromDeg: 170, speedMS: 11.0 },
  { dirFromDeg: 190, speedMS: 12.0 },
  { dirFromDeg: 210, speedMS: 11.0 },
  { dirFromDeg: 230, speedMS: 10.0 },
  { dirFromDeg: 245, speedMS: 9.0 },
  { dirFromDeg: 260, speedMS: 8.5 },
  { dirFromDeg: 270, speedMS: 8.0 },
  { dirFromDeg: 280, speedMS: 7.5 },
  { dirFromDeg: 285, speedMS: 7.0 },
  { dirFromDeg: 290, speedMS: 6.5 },
  { dirFromDeg: 285, speedMS: 6.0 }
] as const;

export function windAt(t: number, i: number, j: number, nx: number, ny: number) {
  const base = BASE_WIND[Math.max(0, Math.min(BASE_WIND.length - 1, t))];

  // normalized x,y in [-1,1]
  const x = nx <= 1 ? 0 : (i / (nx - 1)) * 2 - 1;
  const y = ny <= 1 ? 0 : (j / (ny - 1)) * 2 - 1;

  const speedAdj =
    0.8 * y + 0.4 * Math.sin(2 * Math.PI * x) * Math.sin(Math.PI * y);

  const dirAdj =
    12 * x - 8 * y + 6 * Math.sin(Math.PI * x) * Math.cos(Math.PI * y);

  const speedMS = clamp(base.speedMS + speedAdj, 4, 14);
  const dirFromDeg = wrap360(base.dirFromDeg + dirAdj);

  return { speedMS, dirFromDeg };
}
