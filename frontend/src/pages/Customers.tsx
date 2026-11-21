import { useEffect, useState } from 'react'
import { api } from '../api'
import CustomerModal from '../components/CustomerModal'
import ReceiptModal from '../components/ReceiptModal'
import { money } from '../purchasing'
import type { Statement } from '../payments'
import type { Customer, SalesConfig } from '../sales'

const btn = 'rounded-lg border border-[#1f5fbf] bg-white px-4 py-2 font-semibold text-[#1b4f9c]'
const pri = 'rounded-lg bg-[#1f5fbf] px-4 py-2 font-semibold text-white'
const KIND: Record<string, string> = { GARAGE: 'Garage', MECHANIC: 'Mechanic', RETAIL: 'Retail' }

export default function Customers() {
  const [openId, setOpenId] = useState<number | null>(null)
  return openId === null ? <CustomerList onOpen={setOpenId} /> : <CustomerDetail id={openId} onBack={() => setOpenId(null)} />
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'warn' | 'bad' }) {
  const cls = tone === 'bad' ? 'text-red-800' : tone === 'warn' ? 'text-amber-900' : ''
  return (
    <div className="min-w-48 flex-1 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className={`text-2xl font-bold ${cls}`}>{value}</p>
    </div>
  )
}

function CustomerList({ onOpen }: { onOpen: (id: number) => void }) {
  const [rows, setRows] = useState<Customer[] | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'balance' | 'overdue'>('all')
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => {
      api<Customer[]>(`/parties/customers/${q ? `?q=${encodeURIComponent(q)}` : ''}`).then(setRows).catch((e: Error) => setError(e.message))
    }, 200)
    return () => clearTimeout(t)
  }, [q, reload])

  const owed = (c: Customer) => Number(c.outstanding ?? 0)
  const late = (c: Customer) => Number(c.overdue ?? 0)
  const all = rows ?? []
  const shown = all.filter((c) => (filter === 'balance' ? owed(c) > 0 : filter === 'overdue' ? late(c) > 0 : true))
  const totalOwed = all.reduce((s, c) => s + Math.max(0, owed(c)), 0)
  const totalLate = all.reduce((s, c) => s + late(c), 0)
  const pill = (on: boolean) => `rounded-full px-4 py-1.5 font-semibold ${on ? 'bg-[#1f5fbf] text-white' : 'border border-slate-300 bg-white'}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-slate-600">Who owes you money, and how long it has been owed.</p>
        </div>
        <button onClick={() => setShowNew(true)} className={pri}>+ New customer</button>
      </div>

      <div className="flex flex-wrap gap-4">
        <Kpi label="Total outstanding" value={money(totalOwed)} />
        <Kpi label="Overdue (over 30 days)" value={money(totalLate)} tone={totalLate > 0 ? 'bad' : undefined} />
        <Kpi label="Customers with a balance" value={String(all.filter((c) => owed(c) > 0).length)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input aria-label="Search customers" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or phone…" className="min-w-64 flex-1 rounded-xl border-2 border-[#1f5fbf] bg-white px-4 py-3" />
        <button onClick={() => setFilter('all')} aria-pressed={filter === 'all'} className={pill(filter === 'all')}>All</button>
        <button onClick={() => setFilter('balance')} aria-pressed={filter === 'balance'} className={pill(filter === 'balance')}>With balance</button>
        <button onClick={() => setFilter('overdue')} aria-pressed={filter === 'overdue'} className={pill(filter === 'overdue')}>Overdue</button>
      </div>

      {error && <p role="alert" className="font-semibold text-red-800">{error}</p>}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4">
        {rows && shown.length === 0 ? (
          <p className="py-8 text-center text-slate-600">No customers match.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead><tr className="bg-slate-50 text-slate-600"><th className="p-2">Customer</th><th className="p-2">Phone</th><th className="p-2 text-right">Outstanding</th><th className="p-2 text-right">Overdue</th><th className="p-2 text-right">Credit limit</th></tr></thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="p-2">
                    <button onClick={() => onOpen(c.id)} className="font-semibold text-[#1b4f9c] underline">{c.name}</button>
                    <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-800">{KIND[c.kind] ?? c.kind}</span>
                  </td>
                  <td className="p-2">{c.phone || '—'}</td>
                  <td className="p-2 text-right font-semibold">{owed(c) > 0 ? money(owed(c)) : owed(c) < 0 ? `Advance ${money(-owed(c))}` : '—'}</td>
                  <td className="p-2 text-right">{late(c) > 0 ? <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-900">{money(late(c))}</span> : '—'}</td>
                  <td className="p-2 text-right">{Number(c.credit_limit) > 0 ? money(c.credit_limit) : 'No credit'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showNew && <CustomerModal onClose={() => setShowNew(false)} onSaved={(c) => { setShowNew(false); setReload((n) => n + 1); onOpen(c.id) }} />}
    </div>
  )
}

function CustomerDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const [st, setSt] = useState<Statement | null>(null)
  const [shop, setShop] = useState('')
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [receipt, setReceipt] = useState(false)
  const [edit, setEdit] = useState(false)

  useEffect(() => {
    api<Statement>(`/payments/statement/${id}/`).then(setSt).catch((e: Error) => setError(e.message))
  }, [id, reload])
  useEffect(() => {
    api<SalesConfig>('/sales/config/').then((c) => setShop(c.shop_name)).catch(() => {})
  }, [])

  if (error) return <p role="alert" className="font-semibold text-red-800">{error}</p>
  if (!st) return <p className="text-slate-600">Loading…</p>

  const c = st.customer
  const owed = Number(st.outstanding)
  const late = Number(st.overdue)
  const limit = Number(c.credit_limit)
  const usedPct = limit > 0 ? Math.min(100, Math.round((owed / limit) * 100)) : 0

  const remind = () => {
    const digits = c.phone.replace(/\D/g, '')
    const to = digits.length === 10 ? `91${digits}` : digits
    const text = encodeURIComponent(
      `Dear ${c.name}, your outstanding balance with ${shop || 'our shop'} is ${money(owed)}` +
        (late > 0 ? `, of which ${money(late)} is overdue` : '') + '. Kindly arrange the payment. Thank you.',
    )
    window.open(`https://wa.me/${to}?text=${text}`, '_blank', 'noopener')
  }

  const bucket = (label: string, v: string, tone: string) => (
    <div className={`min-w-36 flex-1 rounded-xl border p-3 ${tone}`}>
      <p className="text-xs font-semibold">{label}</p>
      <p className="text-lg font-bold">{money(v)}</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className={btn}>← Customers</button>
        <div>
          <h1 className="text-2xl font-bold">{c.name}</h1>
          <p className="text-sm text-slate-600">{KIND[c.kind] ?? c.kind}{c.phone ? ` · ${c.phone}` : ''}{c.gstin ? ` · GSTIN ${c.gstin}` : ''}</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button onClick={() => setEdit(true)} className={btn}>Edit</button>
          <button onClick={remind} disabled={owed <= 0} className={btn + ' disabled:opacity-50'}>Send reminder on WhatsApp</button>
          <button onClick={() => setReceipt(true)} disabled={owed <= 0} className={pri + ' disabled:opacity-50'}>Receive payment</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Kpi label="Outstanding" value={money(owed)} />
        <Kpi label="Overdue (over 30 days)" value={money(late)} tone={late > 0 ? 'bad' : undefined} />
        <div className="min-w-48 flex-1 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Credit limit</p>
          <p className="text-2xl font-bold">{limit > 0 ? money(limit) : 'No credit'}</p>
          {limit > 0 && (
            <>
              <div className="mt-2 h-2 rounded bg-slate-200" role="img" aria-label={`${usedPct}% of credit limit used`}>
                <div className={`h-2 rounded ${usedPct >= 90 ? 'bg-red-700' : 'bg-[#1f5fbf]'}`} style={{ width: `${usedPct}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-600">{usedPct}% used</p>
            </>
          )}
        </div>
      </div>
      {Number(st.advance) > 0 && <p className="rounded-lg bg-blue-50 p-3 text-sm font-semibold text-blue-900">This customer has an advance credit of {money(st.advance)}, which will be applied to their next credit bill.</p>}

      <div className="flex flex-wrap gap-3">
        {bucket('0 to 30 days', st.buckets.current, 'border-slate-200 bg-white')}
        {bucket('31 to 60 days', st.buckets.d31_60, 'border-amber-300 bg-amber-50 text-amber-950')}
        {bucket('61 to 90 days', st.buckets.d61_90, 'border-orange-300 bg-orange-50 text-orange-950')}
        {bucket('Over 90 days', st.buckets.d90_plus, 'border-red-300 bg-red-50 text-red-950')}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-bold">Unpaid bills</h2>
        {st.open_invoices.length === 0 ? (
          <p className="py-4 text-slate-600">No unpaid bills.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead><tr className="bg-slate-50 text-slate-600"><th className="p-2">Bill</th><th className="p-2">Date</th><th className="p-2 text-right">Bill total</th><th className="p-2 text-right">Still owed</th><th className="p-2">Age</th></tr></thead>
            <tbody>
              {st.open_invoices.map((i) => (
                <tr key={i.id} className="border-b border-slate-100">
                  <td className="p-2 font-semibold">{i.number}</td>
                  <td className="p-2">{new Date(i.date).toLocaleDateString('en-IN')}</td>
                  <td className="p-2 text-right">{money(i.total)}</td>
                  <td className="p-2 text-right font-semibold">{money(i.open)}</td>
                  <td className="p-2"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${i.overdue ? 'bg-red-100 text-red-900' : 'bg-green-100 text-green-900'}`}>{i.days} days{i.overdue ? ', overdue' : ''}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-bold">Statement</h2>
        {st.entries.length === 0 ? (
          <p className="py-4 text-slate-600">No credit activity yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead><tr className="bg-slate-50 text-slate-600"><th className="p-2">Date</th><th className="p-2">Ref</th><th className="p-2">Details</th><th className="p-2 text-right">Added</th><th className="p-2 text-right">Reduced</th><th className="p-2 text-right">Balance</th></tr></thead>
            <tbody>
              {[...st.entries].reverse().map((e, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="p-2">{new Date(e.at).toLocaleDateString('en-IN')}</td>
                  <td className="p-2 font-semibold">{e.ref}</td>
                  <td className="p-2 text-slate-600">{e.text}</td>
                  <td className="p-2 text-right">{Number(e.debit) > 0 ? money(e.debit) : ''}</td>
                  <td className="p-2 text-right text-green-800">{Number(e.credit) > 0 ? money(e.credit) : ''}</td>
                  <td className="p-2 text-right font-semibold">{money(e.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-xs text-slate-600">Returns are treated as a credit on the account. Payments and credits are applied to the oldest bills first.</p>
      </div>

      {receipt && <ReceiptModal customerId={c.id} name={c.name} owed={owed} onClose={() => setReceipt(false)} onDone={() => { setReceipt(false); setReload((n) => n + 1) }} />}
      {edit && <CustomerModal customer={{ ...c, credit_limit: c.credit_limit }} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); setReload((n) => n + 1) }} />}
    </div>
  )
}
