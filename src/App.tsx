import { useEffect, useMemo, useRef, useState } from "react";
import { START, TARGET, T_MAX } from "./model/constants";
import {
  cellCenterLatLon,
  distKm,
  encode,
  gridSize,
  latLonToCell,
  wrap360,
} from "./model/geo";
import { solveDP } from "./solvers/dp";
import { solveGreedy } from "./solvers/greedy";
import { windAt } from "./model/wind";
import { computeDebugStats } from "./solvers/debug";

type Route = {
  ok: boolean;
  arrivalT: number | null;
  path: { t: number; i: number; j: number }[];
};

export default function App() {
  const { nx, ny } = useMemo(() => gridSize(), []);
  const startCell = useMemo(() => latLonToCell(START.lat, START.lon), []);
  const targetCell = useMemo(() => latLonToCell(TARGET.lat, TARGET.lon), []);
  const startId = useMemo(() => encode(startCell.i, startCell.j, nx), [nx, startCell]);
  const targetId = useMemo(() => encode(targetCell.i, targetCell.j, nx), [nx, targetCell]);
  const debug = useMemo(() => computeDebugStats(nx, ny, startId, targetId), [nx, ny, startId, targetId]);

  const [hour, setHour] = useState(0);
  const [showWind, setShowWind] = useState(true);
  const [dp, setDp] = useState<Route | null>(null);
  const [greedy, setGreedy] = useState<Route | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const run = () => {
    // compute and store results; drawing happens via useEffect below
    setDp(solveDP(startId, targetId, nx, ny, T_MAX));
    setGreedy(solveGreedy(startId, targetId, nx, ny, T_MAX));
  };

  const canvasW = 900;
  const canvasH = 650;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasW, canvasH);

    // background
    ctx.fillStyle = "#061a24";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // margins and cell scaling
    const pad = 40;
    const gridW = canvasW - 2 * pad;
    const gridH = canvasH - 2 * pad;
    const cellPxX = gridW / nx;
    const cellPxY = gridH / ny;

    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= nx; i++) {
      const x = pad + i * cellPxX;
      ctx.beginPath();
      ctx.moveTo(x, pad);
      ctx.lineTo(x, pad + gridH);
      ctx.stroke();
    }
    for (let j = 0; j <= ny; j++) {
      const y = pad + j * cellPxY;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(pad + gridW, y);
      ctx.stroke();
    }

    // wind arrows (subsample)
    if (showWind) {
      const step = Math.max(1, Math.floor(Math.max(nx, ny) / 12));
      for (let j = 0; j < ny; j += step) {
        for (let i = 0; i < nx; i += step) {
          const w = windAt(hour, i, j, nx, ny);
          const windTo = wrap360(w.dirFromDeg + 180);
          const rad = ((90 - windTo) * Math.PI) / 180; // heading -> canvas angle

          const cx = pad + (i + 0.5) * cellPxX;
          const cy = pad + (j + 0.5) * cellPxY;

          const len = 10 + 1.2 * w.speedMS;
          const x2 = cx + Math.cos(rad) * len;
          const y2 = cy - Math.sin(rad) * len;

          ctx.strokeStyle = "rgba(255,255,255,0.50)";
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
    }

    // helper: draw route
    const drawRoute = (route: Route | null, stroke: string) => {
      if (!route?.ok || route.path.length < 2) return;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let k = 0; k < route.path.length; k++) {
        const p = route.path[k];
        const x = pad + (p.i + 0.5) * cellPxX;
        const y = pad + (p.j + 0.5) * cellPxY;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    drawRoute(greedy, "rgba(255,180,80,0.95)"); // orange
    drawRoute(dp, "rgba(120,240,140,0.95)");     // green

    // markers
    const mark = (i: number, j: number, fill: string, label: string) => {
      const x = pad + (i + 0.5) * cellPxX;
      const y = pad + (j + 0.5) * cellPxY;

      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText(label, x + 10, y - 10);
    };

    mark(startCell.i, startCell.j, "rgba(80,160,255,0.95)", "Helsinki");
    mark(targetCell.i, targetCell.j, "rgba(255,80,120,0.95)", "Tallinn");

    // title text
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(`Grid: ${nx} x ${ny} (5km) | Hour: ${hour}`, 20, 22);
  }, [nx, ny, hour, showWind, dp, greedy, startCell.i, startCell.j, targetCell.i, targetCell.j]);

  // small helper metrics
  const dpMsg = dp ? (dp.ok ? `arrives in ${dp.arrivalT}h` : "not reached") : "—";
  const grMsg = greedy ? (greedy.ok ? `arrives in ${greedy.arrivalT}h` : "not reached") : "—";

  // optional: show straight-line distance for user intuition
  const startLL = cellCenterLatLon(startCell.i, startCell.j);
  const targetLL = cellCenterLatLon(targetCell.i, targetCell.j);
  const approxKm = distKm(startLL, targetLL);

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif", color: "rgba(255,255,255,0.95)" }}>
      <h2 style={{ margin: "8px 0", color: "rgba(255,255,255,0.97)" }}>Dynamic Sailing Routing (DP vs Greedy)</h2>

      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <canvas
            ref={canvasRef}
            width={canvasW}
            height={canvasH}
            style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.18)" }}
          />
        </div>

        <div style={{ minWidth: 320, maxWidth: 420 }}>
          <div style={{ padding: 14, borderRadius: 12, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
              <button
                onClick={run}
                style={{
                  padding: "9px 12px",
                  borderRadius: 10,
                  cursor: "pointer",
                  background: "rgba(255,255,255,0.92)",
                  border: "none",
                }}
              >
                Run solvers
              </button>

              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={showWind} onChange={(e) => setShowWind(e.target.checked)} />
                Show wind
              </label>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 6 }}>Hour: {hour}</div>
              <input
                type="range"
                min={0}
                max={T_MAX}
                value={hour}
                onChange={(e) => setHour(parseInt(e.target.value, 10))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginTop: 10, lineHeight: 1.55 }}>
              <div><b>Optimal (DP):</b> {dpMsg}</div>
              <div><b>Greedy baseline:</b> {grMsg}</div>
              <div style={{ marginTop: 10, opacity: 0.9 }}>
                Straight-line distance (approx): <b>{approxKm.toFixed(1)} km</b>
              </div>
              <div style={{ marginTop: 10, opacity: 0.88 }}>
                Green = DP optimal (earliest arrival). Orange = greedy “always get closer to Tallinn”.
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.18)" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Debug</div>
            <div style={{ fontSize: 13, opacity: 0.95, lineHeight: 1.45 }}>
              <div>Reachable cells by hour: {debug.reachableCounts.join(", ")}</div>
              <div style={{ marginTop: 8 }}>
                Feasible moves from Helsinki cell at t=0:
                <ul style={{ margin: "6px 0 0 18px" }}>
                  {debug.startFeasibleMovesAtT0
                    .filter((m) => m.feasible)
                    .map((m) => (
                      <li key={m.headingDeg}>
                        heading {m.headingDeg}°, TWA {m.twaDeg.toFixed(0)}°, wind {m.windSpeedMS.toFixed(1)} m/s @ {m.windFromDeg.toFixed(0)}°,
                        boat {m.boatKnots.toFixed(2)} kn → max {m.maxKm.toFixed(1)} km (need {m.reqKm.toFixed(1)} km)
                      </li>
                    ))}
                </ul>
                {debug.startFeasibleMovesAtT0.filter((m) => m.feasible).length === 0 && (
                  <div style={{ marginTop: 6, color: "rgba(255,120,120,0.95)" }}>
                    No feasible moves from the start at hour 0. This usually means the polar is too slow, the no-go zone is too strict,
                    or the grid/time step requires more distance than the boat can cover.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 13, opacity: 0.9 }}>
            Tip: Click “Run solvers”, then move the hour slider to see wind rotating E → S → W with spatial variation.
          </div>
        </div>
      </div>
    </div>
  );
}
