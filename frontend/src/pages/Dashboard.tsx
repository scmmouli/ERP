import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { BarChart, Donut, shortDate } from '../components/Charts'
import { downloadFile } from '../download'
import { money } from '../purchasing'
import { MODE_LABEL } from '../reports'
import type { DashboardData, LowItem } from '../reports'

const btn = 'rounded-lg border border-[#1f5fbf] bg-white px-4 py-2 text-sm font-semibold text-[#1b4f9c]'
const card = 'rounded-2xl border border-slate-200 bg-white p-4'

function Kpi({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'good' | 'bad' | 'warn' | 'info' }) {
  const t = { good: 'bg-green-100 text-green-900', bad: 'bg-red-100 text-red-900', warn: 'bg-amber-100 text-amber-900', info: 'bg-blue-100 text-blue-900' }
  return (
    <div className={`${card} min-w-52 flex-1`}>
      <p className="text-sm text-slate-600">{label}</p>
      <p className="my-1 text-2xl font-bold">{value}</p>
      {note && <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${t[tone ?? 'info']}`}>{note}</span>}
    </div>
  )
}

function LowStockTable({ items }: { items: LowItem[] }) {
  if (!items.length) return <p className="py-4 text-slate-600">Nothing is below its reorder level.</p>
  return (
    <table className="w-full text-left text-sm">
      <thead><tr className="bg-slate-50 text-slate-600"><th className="p-2">Part</th><th className="p-2 text-right">In stock</th><th className="p-2 text-right">Reorder at</th><th className="p-2">Status</th></tr></thead>
      <tbody>
        {items.map((i) => {
          const n = Number(i.stock)
          return (
            <tr key={i.id} className="border-b border-slate-100">
              <td className="p-2"><span className="block font-semibold">{i.part_number}</span><span className="text-slate-600">{i.name}</span></td>
              <td className="p-2 text-right">{n}</td>
              <td className="p-2 text-right">{i.reorder_level}</td>
              <td className="p-2"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${n <= 0 ? 'bg-red-100 text-red-900' : 'bg-amber-100 text-amber-900'}`}>{n <= 0 ? 'Out of stock' : 'Low'}</span></td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [d, setD] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<DashboardData>('/reports/dashboard/').then(setD).catch((e: Error) => setError(e.message))
  }, [])

  const save = (path: string, name: string) => () => downloadFile(path, name).catch((e: Error) => setError(e.message))
  const isOwner = user?.role === 'OWNER'

  if (error) return <p role="alert" className="font-semibold text-red-800">{error}</p>
  if (!d) return <p className="text-slate-600">Loading…</p>

  const low = d.low_stock
  const today = d.today
  const change = today?.change_pct

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-600">{isOwner ? 'The shop today at a glance.' : `Welcome, ${user?.username}.`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(isOwner || user?.role === 'STOREKEEPER') && <button onClick={save('/reports/stock/export/', 'stock.xlsx')} className={btn}>Stock list (Excel)</button>}
          {isOwner && <button onClick={save('/reports/outstanding/export/', 'outstanding.xlsx')} className={btn}>Outstanding (Excel)</button>}
        </div>
      </div>

      {d.limited ? (
        <div className={`${card} overflow-x-auto`}>
          <h2 className="mb-3 font-bold">Low stock <span className="ml-2 text-sm font-normal text-slate-600">{low.count} parts, {low.out_of_stock} out of stock</span></h2>
          <LowStockTable items={low.items} />
          <div className="mt-3"><Link to="/items" className="font-semibold text-[#1b4f9c] underline">Open Items</Link></div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            <Kpi label="Today's sales" value={money(today!.total)} note={change == null ? `${today!.count} bills today` : `${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}% vs yesterday`} tone={change == null ? 'info' : change >= 0 ? 'good' : 'bad'} />
            <Kpi label="Outstanding" value={money(d.outstanding!.total)} note={Number(d.outstanding!.overdue) > 0 ? `${money(d.outstanding!.overdue)} overdue` : `${d.outstanding!.customers} customers`} tone={Number(d.outstanding!.overdue) > 0 ? 'bad' : 'info'} />
            <Kpi label="Low-stock items" value={String(low.count)} note={`${low.out_of_stock} out of stock`} tone={low.out_of_stock > 0 ? 'bad' : 'info'} />
            <Kpi label="Stock value (at cost)" value={money(d.stock_value!.amount)} note={d.stock_value!.uncosted_items > 0 ? `${d.stock_value!.uncosted_items} parts have no cost` : undefined} tone="warn" />
          </div>

          <div className="flex flex-col gap-4 lg:flex-row">
            <div className={`${card} min-w-0 flex-[1.5]`}>
              <h2 className="mb-2 font-bold">Sales, last 7 days</h2>
              <BarChart label="Daily sales for the last 7 days" data={d.last7!.map((x) => ({ label: shortDate(x.date), value: Number(x.total) }))} />
            </div>
            <div className={`${card} min-w-0 flex-1`}>
              <h2 className="mb-2 font-bold">Payment mix today</h2>
              <Donut label="Share of today's sales by payment mode" parts={d.payment_mix!.map((m) => ({ label: MODE_LABEL[m.mode] ?? m.mode, value: Number(m.total) }))} />
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row">
            <div className={`${card} min-w-0 flex-[1.2] overflow-x-auto`}>
              <h2 className="mb-2 font-bold">Low stock: reorder soon</h2>
              <LowStockTable items={low.items} />
              <div className="mt-3"><Link to="/purchase" className="font-semibold text-[#1b4f9c] underline">Receive goods</Link></div>
            </div>
            <div className={`${card} min-w-0 flex-1 overflow-x-auto`}>
              <h2 className="mb-2 font-bold">Highest outstanding</h2>
              {d.top_debtors!.length === 0 ? (
                <p className="py-4 text-slate-600">Nobody owes anything.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead><tr className="bg-slate-50 text-slate-600"><th className="p-2">Customer</th><th className="p-2 text-right">Owes</th><th className="p-2 text-right">Overdue</th></tr></thead>
                  <tbody>
                    {d.top_debtors!.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100">
                        <td className="p-2 font-semibold">{c.name}</td>
                        <td className="p-2 text-right">{money(c.outstanding)}</td>
                        <td className="p-2 text-right">{Number(c.overdue) > 0 ? <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-900">{money(c.overdue)}</span> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="mt-3"><Link to="/customers" className="font-semibold text-[#1b4f9c] underline">All customers</Link></div>
            </div>
          </div>

          <div className={`${card} overflow-x-auto`}>
            <h2 className="mb-2 font-bold">Top movers this month</h2>
            {d.top_movers!.length === 0 ? (
              <p className="py-4 text-slate-600">No sales this month yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead><tr className="bg-slate-50 text-slate-600"><th className="p-2">Part</th><th className="p-2 text-right">Quantity sold</th></tr></thead>
                <tbody>
                  {d.top_movers!.map((m) => (
                    <tr key={m.part_number} className="border-b border-slate-100">
                      <td className="p-2"><span className="block font-semibold">{m.part_number}</span><span className="text-slate-600">{m.name}</span></td>
                      <td className="p-2 text-right font-semibold">{Number(m.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
