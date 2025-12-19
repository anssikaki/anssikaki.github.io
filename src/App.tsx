import { useMemo, useState } from "react";
import { START, TARGET, T_MAX } from "./model/constants";
import { encode, gridSize, latLonToCell, cellCenterLatLon, wrap360 } from "./model/geo";
import { solveDP } from "./solvers/dp";
import { solveGreedy } from "./solvers/greedy";
import { windAt } from "./model/wind";

type Route = { ok: boolean; arrivalT: number | null; path: { t: number; i: number; j: number }[] };

export default function App() {
  const { nx, ny } = useMemo(() => gridSize(), []);
  const startCell = useMemo(() => latLonToCell(START.lat, START.lon), []);
  const targetCell = useMemo(() => latLonToCell(TARGET.lat, TARGET.lon), []);
  const startId = useMemo(() => encode(startCell.i, startCell.j, nx), [nx, startCell]);
  const targetId = useMemo(() => encode(targetCell.i, targetCell.j, nx), [nx, targetCell]);

  const [hour, setHour] = useState(0);
  const [showWind, setShowWind] = useState(true);
  const [dp, setDp] = useState<Route | null>(null);
  const [greedy, setGreedy] = useState<Route | null>(null);

  const run = () => {
    setDp(solveDP(startId, targetId, nx, ny, T_MAX));
    setGreedy(solveGreedy(startId, targetId, nx, ny, T_MAX));
  };

  const canvasW = 900;
  const canvasH = 650;

  // render on every state change via inline draw
  useMemo(() => {
    const c = document.getElementById("map") as HTMLCanvasElement | null;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasW, canvasH);

    // background
    ctx.fillStyle = "#0b2230";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // margins and cell scaling
    const pad = 40;
    const gridW = canvasW - 2 * pad;
    const gridH = canvasH - 2 * pad;
    const cellPxX = gridW / nx;
    const cellPxY = gridH / ny;

    // draw grid (light)
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= nx; i++) {
      const x = pad + i * cellPxX;
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, pad + gridH); ctx.stroke();
    }
    for (let j = 0; j <= ny; j++) {
      const y = pad + j * cellPxY;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + gridW, y); ctx.stroke();
    }

    // wind arrows (subsample to reduce clutter)
    if (showWind) {
      const step = Math.max(1, Math.floor(Math.max(nx, ny) / 12));
      for (let j = 0; j < ny; j += step) {
        for (let i = 0; i < nx; i += step) {
          const w = windAt(hour, i, j, nx, ny);
          const windTo = wrap360(w.dirFromDeg + 180);
          const rad = ((90 - windTo) * Math.PI) / 180; // convert heading to canvas angle
          const cx = pad + (i + 0.5) * cellPxX;
          const cy = pad + (j + 0.5) * cellPxY;

          const len = 10 + 1.2 * w.speedMS;
          const x2 = cx + Math.cos(rad) * len;
          const y2 = cy - Math.sin(rad) * len;

          ctx.strokeStyle = "rgba(255,255,255,0.35)";
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
    }

    // helper to draw route
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

    drawRoute(greedy, "rgba(255,180,80,0.9)");
    drawRoute(dp, "rgba(120,220,120,0.9)");

    // start/target markers
    const mark = (i: number, j: number, fill: string, label: string) => {
      const x = pad + (i + 0.5) * cellPxX;
      const y = pad + (j + 0.5) * cellPxY;
      ctx.fillStyle = fill;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = "12px sans-serif";
      ctx.fillText(label, x + 10, y - 10);
    };
    mark(startCell.i, startCell.j, "rgba(80,160,255,0.95)", "Start");
    mark(targetCell.i, targetCell.j, "rgba(255,80,120,0.95)", "Target");

    // legend
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "14px sans-serif";
    const sLL = cellCenterLatLon(startCell.i, startCell.j);
    const tLL = cellCenterLatLon(targetCell.i, targetCell.j);
    ctx.fillText(`Grid: ${nx} x ${ny} (5km). Hour: ${hour}`, 20, 22);
    ctx.fillText(`Start cell center: ${sLL.lat.toFixed(4)}, ${sLL.lon.toFixed(4)}`, 20, 42);
    ctx.fillText(`Target cell center: ${tLL.lat.toFixed(4)}, ${tLL.lon.toFixed(4)}`, 20, 62);
  }, [nx, ny, hour, showWind, dp, greedy, startCell, targetCell, canvasW, canvasH, startId, targetId]);

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif", color: "#e8eef2" }}>
      <h2 style={{ margin: "8px 0" }}>Dynamic Sailing Routing (DP vs Greedy)</h2>

      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <canvas id="map" width={canvasW} height={canvasH} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" }} />
        </div>

        <div style={{ minWidth: 320, maxWidth: 420 }}>
          <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <button onClick={run} style={{ padding: "8px 10px", borderRadius: 10, cursor: "pointer" }}>
                Run solvers
              </button>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={showWind} onChange={(e) => setShowWind(e.target.checked)} />
                Show wind
              </label>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div>Hour: {hour}</div>
              <input
                type="range"
                min={0}
                max={T_MAX}
                value={hour}
                onChange={(e) => setHour(parseInt(e.target.value, 10))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginTop: 12, lineHeight: 1.5 }}>
              <div><b>Optimal (DP):</b> {dp ? (dp.ok ? `arrives in ${dp.arrivalT}h` : "not reached") : "—"}</div>
              <div><b>Greedy baseline:</b> {greedy ? (greedy.ok ? `arrives in ${greedy.arrivalT}h` : "not reached") : "—"}</div>
              <div style={{ marginTop: 10, opacity: 0.85 }}>
                Green = DP optimal (earliest arrival). Orange = greedy “always get closer to target”.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>
            Tip: click “Run solvers”, then move the hour slider to see how wind rotates E→S→W and varies spatially.
          </div>
        </div>
      </div>
    </div>
  );
}
