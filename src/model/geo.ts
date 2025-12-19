import { CELL_KM, LAT_MAX, LAT_MIN, LON_MAX, LON_MIN } from "./constants";

export type Cell = { i: number; j: number };

export function kmPerDegLat(): number {
  return 111.32;
}

export function kmPerDegLon(latDeg: number): number {
  const latRad = (latDeg * Math.PI) / 180;
  return 111.32 * Math.cos(latRad);
}

export function lat0(): number {
  return (LAT_MIN + LAT_MAX) / 2;
}

export function gridSize(): { nx: number; ny: number } {
  const kLat = kmPerDegLat();
  const kLon = kmPerDegLon(lat0());
  const widthKm = (LON_MAX - LON_MIN) * kLon;
  const heightKm = (LAT_MAX - LAT_MIN) * kLat;
  const nx = Math.max(1, Math.floor(widthKm / CELL_KM));
  const ny = Math.max(1, Math.floor(heightKm / CELL_KM));
  return { nx, ny };
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function wrap360(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

// smallest difference between headings a and b, folded to [0,180]
export function angleDiff180(aDeg: number, bDeg: number): number {
  const a = wrap360(aDeg);
  const b = wrap360(bDeg);
  let d = Math.abs(a - b);
  if (d > 180) d = 360 - d;
  return d;
}

export function latLonToCell(lat: number, lon: number): Cell {
  const { nx, ny } = gridSize();
  const kLat = kmPerDegLat();
  const kLon = kmPerDegLon(lat0());

  const xKm = (lon - LON_MIN) * kLon;
  const yKm = (LAT_MAX - lat) * kLat; // y increases southward
  const i = clamp(Math.floor(xKm / CELL_KM), 0, nx - 1);
  const j = clamp(Math.floor(yKm / CELL_KM), 0, ny - 1);
  return { i, j };
}

export function cellCenterLatLon(i: number, j: number): { lat: number; lon: number } {
  const kLat = kmPerDegLat();
  const kLon = kmPerDegLon(lat0());

  const lon = LON_MIN + ((i + 0.5) * CELL_KM) / kLon;
  const lat = LAT_MAX - ((j + 0.5) * CELL_KM) / kLat;
  return { lat, lon };
}

export function encode(i: number, j: number, nx: number): number {
  return j * nx + i;
}
export function decode(id: number, nx: number): Cell {
  const j = Math.floor(id / nx);
  const i = id - j * nx;
  return { i, j };
}

export function distKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  // small-area equirectangular approximation
  const kLat = kmPerDegLat();
  const kLon = kmPerDegLon((a.lat + b.lat) / 2);
  const dx = (b.lon - a.lon) * kLon;
  const dy = (b.lat - a.lat) * kLat;
  return Math.hypot(dx, dy);
}
