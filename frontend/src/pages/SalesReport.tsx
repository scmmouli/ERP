import { useEffect, useState } from 'react'
import { api } from '../api'
import { Donut, LineChart, shortDate } from '../components/Charts'
import { downloadFile } from '../download'
import { money } from '../purchasing'
import { MODE_LABEL } from '../reports'
import type { SalesReportData } from '../reports'

const card = 'rounded-2xl border border-slate-200 bg-white p-4'
const btn = 'rounded-lg border border-[#1f5fbf] bg-white px-4 py-2 font-semibold text-[#1b4f9c]'
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

type Preset = 'today' | '7' | 'month' | 'last' | 'custom'

function range(p: Preset): [string, string] {
  const t = new Date()
  if (p === 'today') return [iso(t), iso(t)]
  if (p === '7') return [iso(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 6)), iso(t)]
  if (p === 'last') return [iso(new Date(t.getFullYear(), t.getMonth() - 1, 1)), iso(new Date(t.getFullYear(), t.getMonth(), 0))]
  return [iso(new Date(t.getFullYear(), t.getMonth(), 1)), iso(t)]
}

function Kpi({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'good' | 'warn' | 'info' }) {
  const t = { good: 'bg-green-100 text-green-900', warn: 'bg-amber-100 text-amber-900', info: 'bg-blue-100 text-blue-900' }
  return (
    <div className={`${card} min-w-52 flex-1`}>
      <p className="text-sm text-slate-600">{label}</p>
      <p className="my-1 text-2xl font-bold">{value}</p>
      {note && <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${t[tone ?? 'info']}`}>{note}</span>}
    </div>
  )
}

export default function SalesReport() {
  const [preset, setPreset] = useState<Preset>('month')
  const [[from, to], setDates] = useState<[string, string]>(range('month'))
  const [d, setD] = useState<SalesReportData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<SalesReportData>(`/reports/sales/?from=${from}&to=${to}`)
      .then((r) => { setD(r); setError('') })
      .catch((e: Error) => setError(e.message))
  }, [from, to])

  const pick = (p: Preset) => {
    setPreset(p)
    if (p !== 'custom') setDates(range(p))
  }
  const pill = (on: boolean) => `rounded-full px-4 py-1.5 font-semibold ${on ? 'bg-[#1f5fbf] text-white' : 'border border-slate-300 bg-white'}`
  const k = d?.kpis
  const maxBrand = Math.max(1, ...(d?.by_brand ?? []).map((b) => Number(b.revenue)))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sales Report</h1>
          <p className="text-sm text-slate-600">Business performance for the selected period.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={() => downloadFile(`/reports/sales/export/?from=${from}&to=${to}`, `sales_${from}_to_${to}.xlsx`).catch((e: Error) => setError(e.message))} className={btn}>Export to Excel</button>
          <button onClick={() => window.print()} className={btn}>Print / PDF</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {([['today', 'Today'], ['7', 'Last 7 days'], ['month', 'This month'], ['last', 'Last month'], ['custom', 'Custom']] as [Preset, string][]).map(([p, label]) => (
          <button key={p} onClick={() => pick(p)} aria-pressed={preset === p} className={pill(preset === p)}>{label}</button>
        ))}
        <input aria-label="From date" type="date" value={from} max={to} onChange={(e) => { setPreset('custom'); setDates([e.target.value, to]) }} className="rounded-lg border border-slate-400 px-3 py-1.5" />
        <span>to</span>
        <input aria-label="To date" type="date" value={to} min={from} onChange={(e) => { setPreset('custom'); setDates([from, e.target.value]) }} className="rounded-lg border border-slate-400 px-3 py-1.5" />
      </div>
      <p className="hidden text-sm print:block">Period: {from} to {to}</p>

      {error && <p role="alert" className="font-semibold text-red-800">{error}</p>}
      {!d || !k ? (
        !error && <p className="text-slate-600">Loading…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            <Kpi label="Total billed (incl. GST)" value={money(k.billed)} note={`${k.invoices} bills, average ${money(k.avg_bill)}`} />
            <Kpi label="Net sales (excl. GST)" value={money(k.net_sales)} note={Number(k.returns) > 0 ? `${money(k.returns)} returned` : 'No returns'} tone="info" />
            <Kpi label="Estimated gross profit" value={money(k.gross_profit)} note={k.margin_pct == null ? 'No cost data yet' : `${k.margin_pct}% margin`} tone={k.margin_pct == null ? 'warn' : 'good'} />
            <Kpi label="Credit sales (unpaid)" value={money(k.credit_sales)} tone="warn" note={Number(k.billed) > 0 ? `${Math.round((Number(k.credit_sales) / Number(k.billed)) * 100)}% of billed` : undefined} />
          </div>
          {k.uncosted_items > 0 && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-950">
              {k.uncosted_items} sold part(s) have no purchase cost recorded, so profit leaves them out. Add a Cost Price in the Excel import or receive them through Purchase.
            </p>
          )}

          <div className="flex flex-col gap-4 lg:flex-row">
            <div className={`${card} min-w-0 flex-[2]`}>
              <h2 className="mb-2 font-bold">Daily sales</h2>
              <LineChart label="Daily sales over the selected period" data={d.daily.map((x) => ({ label: shortDate(x.date), value: Number(x.total) }))} />
            </div>
            <div className={`${card} min-w-0 flex-1`}>
              <h2 className="mb-2 font-bold">Payment mode</h2>
              <Donut label="Share of sales by payment mode" parts={d.payment_mode.map((m) => ({ label: MODE_LABEL[m.mode] ?? m.mode, value: Number(m.total) }))} />
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row">
            <div className={`${card} min-w-0 flex-[1.5] overflow-x-auto`}>
              <h2 className="mb-2 font-bold">Top selling parts</h2>
              {d.top_items.length === 0 ? <p className="py-4 text-slate-600">No sales in this period.</p> : (
                <table className="w-full text-left text-sm">
                  <thead><tr className="bg-slate-50 text-slate-600"><th className="p-2">Part</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Net sales</th><th className="p-2 text-right">Margin</th></tr></thead>
                  <tbody>
                    {d.top_items.map((i) => (
                      <tr key={i.part_number} className="border-b border-slate-100">
                        <td className="p-2"><span className="block font-semibold">{i.part_number}</span><span className="text-slate-600">{i.name}</span></td>
                        <td className="p-2 text-right">{Number(i.qty)}</td>
                        <td className="p-2 text-right">{money(i.revenue)}</td>
                        <td className="p-2 text-right">{i.margin_pct == null ? '—' : <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${i.margin_pct >= 15 ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-900'}`}>{i.margin_pct}%</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className={`${card} min-w-0 flex-1`}>
              <h2 className="mb-3 font-bold">Sales by brand</h2>
              {d.by_brand.length === 0 ? <p className="text-slate-600">No sales in this period.</p> : d.by_brand.map((b) => (
                <div key={b.brand} className="mb-3">
                  <div className="mb-1 flex justify-between text-sm"><span>{b.brand}</span><b>{money(b.revenue)}</b></div>
                  <div className="h-2 rounded bg-blue-100"><div className="h-2 rounded bg-[#1f5fbf]" style={{ width: `${(Number(b.revenue) / maxBrand) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row">
            <div className={`${card} min-w-0 flex-1 overflow-x-auto`}>
              <h2 className="mb-2 font-bold">Top customers</h2>
              {d.top_customers.length === 0 ? <p className="py-4 text-slate-600">No sales in this period.</p> : (
                <table className="w-full text-left text-sm">
                  <thead><tr className="bg-slate-50 text-slate-600"><th className="p-2">Customer</th><th className="p-2 text-right">Billed</th></tr></thead>
                  <tbody>{d.top_customers.map((c) => <tr key={c.name} className="border-b border-slate-100"><td className="p-2">{c.name}</td><td className="p-2 text-right font-semibold">{money(c.billed)}</td></tr>)}</tbody>
                </table>
              )}
            </div>
            <div className={`${card} min-w-0 flex-1 overflow-x-auto`}>
              <h2 className="mb-2 font-bold">Sales by staff</h2>
              {d.by_staff.length === 0 ? <p className="py-4 text-slate-600">No sales in this period.</p> : (
                <table className="w-full text-left text-sm">
                  <thead><tr className="bg-slate-50 text-slate-600"><th className="p-2">User</th><th className="p-2 text-right">Bills</th><th className="p-2 text-right">Billed</th></tr></thead>
                  <tbody>{d.by_staff.map((s) => <tr key={s.user} className="border-b border-slate-100"><td className="p-2">{s.user}</td><td className="p-2 text-right">{s.count}</td><td className="p-2 text-right font-semibold">{money(s.total)}</td></tr>)}</tbody>
                </table>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-600">Profit is an estimate: it uses each part's average purchase cost (from opening stock and goods received), not the exact cost of the units sold. Net sales and profit exclude returned quantities.</p>
        </>
      )}
    </div>
  )
}
