"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fmt, fmtCompact, fmtSigned, fmtSignedCompact, shortDay, weekRange } from "./format";

const H = 280;
const PAD = { top: 26, right: 18, bottom: 58, left: 56 };
const INK = "#14202b";
const SALIDAS = "#3d8fb3";
const MAGENTA = "#b4237e";

// Curva monótona (Fritsch–Carlson): sigue los datos sin inventar picos.
function monotonePath(pts) {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const n = pts.length;
  const dx = [], dy = [], m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    dy[i] = pts[i + 1][1] - pts[i][1];
    m[i] = dy[i] / dx[i];
  }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  }
  t[n - 1] = m[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

function niceTicks(max) {
  if (max <= 0) return [0, 1];
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * pow).find((s) => s >= raw);
  const ticks = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

export default function TideChart({
  weeks,
  forecast,
  selected,
  onSelect,
  onOpen,
  currentKey,
  periodLabel = "Week",
}) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(320, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasForecast = forecast && !forecast.error && forecast.estimatedNeeded > 0;

  const model = useMemo(() => {
    const cols = weeks.length + (hasForecast ? 1 : 0);
    const plotW = width - PAD.left - PAD.right;
    const colW = plotW / Math.max(cols, 1);
    const x = (i) => PAD.left + colW * (i + 0.5);

    const salidas = weeks.map((w) => (w.payroll || 0) + (w.gastos || 0));
    const values = [
      ...weeks.map((w) => w.ventasNeto || 0),
      ...salidas,
      hasForecast ? forecast.estimatedNeeded : 0,
    ];
    const ticks = niceTicks(Math.max(...values, 1));
    const top = ticks[ticks.length - 1];
    const plotH = H - PAD.top - PAD.bottom;
    const y = (v) => PAD.top + plotH * (1 - v / top);

    const ventasPts = weeks.map((w, i) => [x(i), y(w.ventasNeto || 0)]);
    const salidasPts = salidas.map((v, i) => [x(i), y(v)]);
    const baseY = y(0);

    return { cols, colW, x, y, ticks, baseY, salidas, ventasPts, salidasPts, plotH };
  }, [weeks, width, hasForecast, forecast]);

  const { colW, x, y, ticks, baseY, salidas, ventasPts, salidasPts } = model;

  const ventasD = monotonePath(ventasPts);
  const salidasD = monotonePath(salidasPts);
  const first = ventasPts[0]?.[0] ?? PAD.left;
  const last = ventasPts[ventasPts.length - 1]?.[0] ?? PAD.left;
  const closeDown = `L${last},${baseY} L${first},${baseY} Z`;
  const closeUp = `L${last},${PAD.top - 4} L${first},${PAD.top - 4} Z`;

  const predIndex = weeks.length;
  const lastSalida = salidasPts[salidasPts.length - 1];
  const predPt = hasForecast ? [x(predIndex), y(forecast.estimatedNeeded)] : null;

  function onKey(e, i) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = Math.min(weeks.length - 1, Math.max(0, i + (e.key === "ArrowRight" ? 1 : -1)));
      onSelect(weeks[next].weekStart);
      const g = wrapRef.current?.querySelectorAll(".tide-week")[next];
      g?.focus();
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(weeks[i].weekStart);
    }
  }

  const hw = hover != null ? weeks[hover] : null;
  const showLabelsEvery = colW < 52 ? 2 : 1;

  return (
    <div className="tide" ref={wrapRef}>
      <svg
        viewBox={`0 0 ${width} ${H}`}
        width={width}
        height={H}
        role="group"
        aria-label={`Net sales vs. outflows (payroll plus expenses) by ${periodLabel.toLowerCase()}${hasForecast ? ", with the outflow forecast for next week" : ""}`}
      >
        <defs>
          <clipPath id="tide-above-salidas">
            <path d={`${salidasD} ${closeUp}`} />
          </clipPath>
          <clipPath id="tide-above-ventas">
            <path d={`${ventasD} ${closeUp}`} />
          </clipPath>
          <pattern id="tide-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#b4237e" strokeWidth="1" opacity="0.22" />
          </pattern>
          <pattern id="tide-hatch-ink" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#14202b" strokeWidth="1" opacity="0.07" />
          </pattern>
        </defs>

        {/* Retícula y eje Y */}
        <g className="tide-axis">
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? INK : "#e7e2d3"}
                strokeWidth={t === 0 ? 1.5 : 1}
              />
              <text x={PAD.left - 10} y={y(t) + 3.5} textAnchor="end">
                {fmtCompact(t)}
              </text>
            </g>
          ))}
        </g>

        {/* Bandas de semana: interacción, semana en curso y predicción */}
        {weeks.map((w, i) => {
          const isCurrent = w.weekStart === currentKey;
          return (
            <g
              key={w.weekStart}
              className="tide-week"
              role="button"
              tabIndex={selected === w.weekStart ? 0 : -1}
              aria-pressed={selected === w.weekStart}
              aria-label={`${periodLabel} ${weekRange(w)}: sales ${fmt(w.ventasNeto)}, outflows ${fmt(salidas[i])}, result ${fmtSigned(w.total)}${isCurrent ? ", in progress" : ""}`}
              onClick={() => onOpen(w.weekStart)}
              onKeyDown={(e) => onKey(e, i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              {isCurrent && (
                <rect
                  x={x(i) - colW / 2}
                  y={PAD.top}
                  width={colW}
                  height={baseY - PAD.top}
                  fill="url(#tide-hatch-ink)"
                />
              )}
              <rect
                className="tide-band"
                x={x(i) - colW / 2 + 1}
                y={PAD.top - 18}
                width={colW - 2}
                height={H - PAD.top + 18 - 4}
                rx="4"
              />
            </g>
          );
        })}

        {hasForecast && (
          <g aria-hidden="true">
            <rect
              x={x(predIndex) - colW / 2 + 1}
              y={PAD.top}
              width={colW - 2}
              height={baseY - PAD.top}
              fill="url(#tide-hatch)"
            />
            <text
              x={x(predIndex)}
              y={PAD.top - 8}
              textAnchor="middle"
              fontSize="10.5"
              fontWeight="700"
              fill={MAGENTA}
            >
              Forecast
            </text>
          </g>
        )}

        {/* Marea: superávit (ventas sobre salidas) y déficit */}
        <g className="tide-fill" aria-hidden="true">
          <path d={`${ventasD} ${closeDown}`} fill="rgba(47,111,79,0.16)" clipPath="url(#tide-above-salidas)" />
          <path d={`${salidasD} ${closeDown}`} fill="rgba(61,143,179,0.28)" clipPath="url(#tide-above-ventas)" />
        </g>

        <g aria-hidden="true">
          <path className="tide-line tide-draw" d={salidasD} stroke={SALIDAS} strokeWidth="2" pathLength="1" />
          <path className="tide-line tide-draw" d={ventasD} stroke={INK} strokeWidth="2" pathLength="1" />
          {predPt && lastSalida && (
            <path
              className="tide-line tide-fill"
              d={`M${lastSalida[0]},${lastSalida[1]} L${predPt[0]},${predPt[1]}`}
              stroke={MAGENTA}
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          )}
        </g>

        {/* Marcadores: solo la semana seleccionada a todo color */}
        <g aria-hidden="true">
          {weeks.map((w, i) => {
            const on = selected === w.weekStart || hover === i;
            return (
              <g key={w.weekStart}>
                {on && (
                  <line
                    x1={x(i)}
                    x2={x(i)}
                    y1={PAD.top}
                    y2={baseY}
                    stroke={selected === w.weekStart ? MAGENTA : INK}
                    strokeWidth="1"
                    strokeDasharray="2 3"
                    opacity="0.6"
                  />
                )}
                <circle
                  cx={x(i)}
                  cy={ventasPts[i][1]}
                  r={on ? 5 : 3.5}
                  fill={on ? INK : "#fdfcf8"}
                  stroke={on ? "#fdfcf8" : INK}
                  strokeWidth={on ? 2 : 1.5}
                />
                <circle
                  cx={x(i)}
                  cy={salidasPts[i][1]}
                  r={on ? 5 : 3.5}
                  fill={on ? SALIDAS : "#fdfcf8"}
                  stroke={on ? "#fdfcf8" : SALIDAS}
                  strokeWidth={on ? 2 : 1.5}
                />
              </g>
            );
          })}
          {predPt && (
            <g>
              <rect
                x={predPt[0] - 5.5}
                y={predPt[1] - 5.5}
                width="11"
                height="11"
                transform={`rotate(45 ${predPt[0]} ${predPt[1]})`}
                fill={MAGENTA}
                stroke="#fdfcf8"
                strokeWidth="2"
              />
              <text
                x={predPt[0]}
                y={predPt[1] - 12}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill={MAGENTA}
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {fmtCompact(forecast.estimatedNeeded)}
              </text>
            </g>
          )}
        </g>

        {/* Sondeos: el resultado neto de cada semana, como cifras de una carta */}
        <g aria-hidden="true">
          {weeks.map((w, i) => {
            const on = selected === w.weekStart;
            const pos = (w.total || 0) >= 0;
            const showDate = i % showLabelsEvery === (weeks.length - 1) % showLabelsEvery;
            return (
              <g key={w.weekStart}>
                <text
                  className="sounding"
                  x={x(i)}
                  y={baseY + 19}
                  fill={on ? (pos ? "#2f6f4f" : "#a63a2b") : "#5c6873"}
                  opacity={on ? 1 : 0.9}
                >
                  {colW < 46 && !on ? "" : fmtSignedCompact(w.total)}
                </text>
                {showDate && (
                  <text
                    x={x(i)}
                    y={baseY + 38}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight={on ? 700 : 500}
                    fill={on ? INK : "#5c6873"}
                  >
                    {w.weekStart === currentKey ? (colW < 52 ? "now" : "current") : shortDay(w.weekStart)}
                  </text>
                )}
              </g>
            );
          })}
          {predPt && colW >= 52 && (
            <text x={x(predIndex)} y={baseY + 38} textAnchor="middle" fontSize="11" fontWeight="700" fill={MAGENTA}>
              next
            </text>
          )}
          <text x={PAD.left - 10} y={baseY + 19} textAnchor="end" fontSize="10" fontWeight="700" fill="#14202b">
            Net
          </text>
        </g>
      </svg>

      {hw && (
        <div
          className="tide-tooltip"
          style={{
            left: Math.min(Math.max(x(hover), 96), width - 96),
            top: 4,
          }}
          role="presentation"
        >
          <p>
            {weekRange(hw)}
            {hw.weekStart === currentKey ? " · in progress" : ""}
          </p>
          <dl>
            <dt>Net sales</dt>
            <dd>{fmt(hw.ventasNeto)}</dd>
            <dt>Payroll</dt>
            <dd>{fmt(hw.payroll)}</dd>
            <dt>Expenses</dt>
            <dd>{fmt(hw.gastos)}</dd>
            <dt>Result</dt>
            <dd className={(hw.total || 0) >= 0 ? "amount-pos" : "amount-neg"}>{fmtSigned(hw.total)}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}
