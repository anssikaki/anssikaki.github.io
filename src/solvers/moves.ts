export type Move = { di: number; dj: number; headingDeg: number; isDiagonal: boolean };

export const MOVES_8: Move[] = [
  { di: 0, dj: -1, headingDeg: 0, isDiagonal: false },   // N
  { di: 1, dj: -1, headingDeg: 45, isDiagonal: true },   // NE
  { di: 1, dj: 0, headingDeg: 90, isDiagonal: false },   // E
  { di: 1, dj: 1, headingDeg: 135, isDiagonal: true },   // SE
  { di: 0, dj: 1, headingDeg: 180, isDiagonal: false },  // S
  { di: -1, dj: 1, headingDeg: 225, isDiagonal: true },  // SW
  { di: -1, dj: 0, headingDeg: 270, isDiagonal: false }, // W
  { di: -1, dj: -1, headingDeg: 315, isDiagonal: true }  // NW
];
