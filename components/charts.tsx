'use client';

// Hand-written rather than a charting library: the API exposes no time
// series and no deltas, so every chart this product can honestly draw is a
// count-by-category bar or a proportion donut -- nothing a library earns its
// weight on. SVG and DOM inherit CSS custom properties directly, so dark
// mode is free here and costs nothing on every theme toggle.
//
// If the API ever grows date-bucketed endpoints (incident volume over time,
// a resolution-time distribution), stop and adopt a real library --
// hand-rolling continuous axes, tick selection and hover hit-testing is
// where DIY stops paying for itself.

import { donutArcs, type Datum } from '@/lib/chart-data';

function summarize(data: readonly Datum[], format: (value: number) => string): string {
  return data.map((d) => `${d.label}: ${format(d.value)}`).join(', ');
}

/** Horizontal and div-based. Horizontal isn't a style preference: the
 * dashboard's old vertical bars needed 10px labels to fit "illegal dumping"
 * under a 54px column. Horizontal puts every label on a readable baseline. */
export function BarChart({
  data,
  valueFormat,
  max,
  emptyLabel = 'No data yet.',
}: {
  data: Datum[];
  valueFormat?: (value: number) => string;
  max?: number;
  emptyLabel?: string;
}) {
  const format = valueFormat ?? ((value: number) => String(value));
  if (data.length === 0) return <p className="chart-empty">{emptyLabel}</p>;
  const scaleMax = Math.max(1, max ?? Math.max(...data.map((d) => d.value)));

  return (
    <div className="bar-chart" role="img" aria-label={summarize(data, format)}>
      {data.map((d) => (
        <div className="bar-chart-row" key={d.label}>
          <span className="bar-chart-label">{d.label}</span>
          <div className="bar-chart-track">
            <div
              className="bar-fill"
              style={{ width: `${Math.min(100, (d.value / scaleMax) * 100)}%`, background: d.color }}
            />
          </div>
          <span className="bar-chart-value">{format(d.value)}</span>
        </div>
      ))}
      <table className="sr-only">
        <caption>Chart data</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** SVG built from concentric-circle arcs (stroke-dasharray/-dashoffset) --
 * no arc path maths, no d3. A plain background ring renders underneath so a
 * zero-total dataset shows an empty ring rather than nothing. */
export function DonutChart({
  data,
  size = 140,
  centerValue,
  centerLabel,
}: {
  data: Datum[];
  size?: number;
  centerValue: string | number;
  centerLabel: string;
}) {
  const strokeWidth = Math.round(size * 0.16);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const arcs = donutArcs(data, radius);

  return (
    <div className="donut-chart">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${centerLabel}: ${centerValue}. ${summarize(data, String)}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--surface-2)" strokeWidth={strokeWidth} />
        <g transform={`rotate(-90 ${center} ${center})`}>
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={arc.dashArray}
              strokeDashoffset={arc.dashOffset}
            />
          ))}
        </g>
        <text x="50%" y="46%" textAnchor="middle" className="donut-center-value">
          {centerValue}
        </text>
        <text x="50%" y="63%" textAnchor="middle" className="donut-center-label">
          {centerLabel}
        </text>
      </svg>
      <ul className="donut-legend">
        {data.map((d) => (
          <li key={d.label}>
            <span className="donut-legend-dot" style={{ background: d.color }} aria-hidden="true" />
            {d.label} · {d.value}
          </li>
        ))}
      </ul>
      <table className="sr-only">
        <caption>{centerLabel}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
