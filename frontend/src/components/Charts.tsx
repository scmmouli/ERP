const COLORS = ['#1f5fbf', '#0e7490', '#b45309', '#6b21a8']

export const compact = (n: number) =>
  n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n))

export const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export function BarChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const W = 520, H = 200
  const max = Math.max(1, ...data.map((d) => d.value))
  const bw = W / data.length
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label}>
      {data.map((d, i) => {
        const h = ((H - 50) * d.value) / max
        const x = i * bw + bw * 0.2
        return (
          <g key={d.label}>
            <title>{`${d.label}: ₹ ${d.value.toLocaleString('en-IN')}`}</title>
            <rect x={x} y={H - 28 - h} width={bw * 0.6} height={h} rx={5} fill="#1f5fbf" />
            <text x={x + bw * 0.3} y={H - 32 - h} fontSize="12" textAnchor="middle" fill="#17233a">{d.value > 0 ? compact(d.value) : ''}</text>
            <text x={x + bw * 0.3} y={H - 8} fontSize="12" textAnchor="middle" fill="#51607a">{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function LineChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const W = 720, H = 220
  const max = Math.max(1, ...data.map((d) => d.value))
  const n = Math.max(1, data.length - 1)
  const pts = data.map((d, i) => [20 + (i * (W - 40)) / n, H - 34 - ((H - 64) * d.value) / max] as const)
  const line = pts.map(([x, y]) => `${x.toFixed(0)},${y.toFixed(0)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label}>
      {[0, 1, 2, 3, 4].map((k) => (
        <line key={k} x1={20} x2={W - 20} y1={H - 34 - ((H - 64) * k) / 4} y2={H - 34 - ((H - 64) * k) / 4} stroke="#e6ebf2" />
      ))}
      <text x={20} y={14} fontSize="12" fill="#51607a">Peak ₹ {compact(max)}</text>
      <polygon points={`20,${H - 34} ${line} ${W - 20},${H - 34}`} fill="#e3edfb" />
      <polyline points={line} fill="none" stroke="#1f5fbf" strokeWidth="3" />
      {data.length > 0 && <text x={20} y={H - 10} fontSize="12" fill="#51607a">{data[0].label}</text>}
      {data.length > 1 && <text x={W - 20} y={H - 10} fontSize="12" textAnchor="end" fill="#51607a">{data[data.length - 1].label}</text>}
    </svg>
  )
}

export function Donut({ parts, label }: { parts: { label: string; value: number }[]; label: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0)
  if (total <= 0) return <p className="py-6 text-sm text-slate-600">No sales in this period.</p>
  const C = 251.3
  let offset = 0
  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg viewBox="0 0 120 120" width="130" role="img" aria-label={label}>
        {parts.map((p, i) => {
          const len = (C * p.value) / total
          const el = <circle key={p.label} cx="60" cy="60" r="40" fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} transform="rotate(-90 60 60)" />
          offset += len
          return el
        })}
      </svg>
      <ul className="min-w-40 flex-1 text-sm">
        {parts.map((p, i) => (
          <li key={p.label} className="flex justify-between gap-3 py-1">
            <span><b className="mr-2 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />{p.label}</span>
            <span className="font-semibold">{Math.round((p.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
