import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import type { Item, Page } from '../catalog'
import CustomerModal from '../components/CustomerModal'
import InvoiceView from '../components/InvoiceView'
import PartPicker from '../components/PartPicker'
import { money } from '../purchasing'
import { calcLine } from '../sales'
import type { Customer, Invoice, SalesConfig } from '../sales'

const num = (s: string) => Number(s) || 0
const btn = 'rounded-lg border border-[#1f5fbf] bg-white px-4 py-2 font-semibold text-[#1b4f9c]'
const cell = 'w-20 rounded-lg border border-slate-400 px-2 py-1.5 text-right disabled:bg-slate-100'
const key = 'rounded bg-[#0f1f36] px-1.5 py-0.5 text-xs text-white'

export default function Billing() {
  const [tab, setTab] = useState<'new' | 'recent'>('new')
  const [viewId, setViewId] = useState<number | null>(null)
  const [editorKey, setEditorKey] = useState(0)

  if (viewId !== null) {
    return <InvoiceView id={viewId} onBack={() => { setViewId(null); setTab('recent') }} onNew={() => { setViewId(null); setTab('new'); setEditorKey((k) => k + 1) }} />
  }

  const tabCls = (on: boolean) => `rounded-full px-4 py-1.5 font-semibold ${on ? 'bg-[#1f5fbf] text-white' : 'border border-slate-300 bg-white'}`
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Counter Billing</h1>
          <p className="text-sm text-slate-600">Fast bill entry for the counter.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('new')} className={tabCls(tab === 'new')}>New bill</button>
          <button onClick={() => setTab('recent')} className={tabCls(tab === 'recent')}>Recent bills</button>
        </div>
      </div>
      {tab === 'new' ? <BillEditor key={editorKey} onSaved={setViewId} /> : <RecentBills onOpen={setViewId} />}
    </div>
  )
}

interface BillLine {
  item: number
  part_number: string
  name: string
  stock: number
  qty: string
  rate: string
  discount: string
  gst_rate: number
  list_price: number
}

function BillEditor({ onSaved }: { onSaved: (id: number) => void }) {
  const { user } = useAuth()
  const isOwner = user?.role === 'OWNER'
  const [config, setConfig] = useState<SalesConfig | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState('')
  const [lines, setLines] = useState<BillLine[]>([])
  const [mode, setMode] = useState<'CASH' | 'UPI' | 'CREDIT'>('CASH')
  const [paidNow, setPaidNow] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showCustomer, setShowCustomer] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const customerRef = useRef<HTMLSelectElement>(null)
  const saveRef = useRef<() => void>(() => {})

  useEffect(() => {
    api<SalesConfig>('/sales/config/').then(setConfig).catch((e: Error) => setError(e.message))
    api<Customer[]>('/parties/customers/').then(setCustomers).catch(() => {})
  }, [])

  const customer = customers.find((c) => c.id === Number(customerId)) ?? null
  const inter = !!customer && !!config && customer.state_code !== config.shop_state_code
  const rows = lines.map((l) => ({ l, c: calcLine(num(l.qty), num(l.rate), num(l.discount), l.gst_rate, config?.prices_include_gst ?? false, inter) }))
  const sum = (k: 'taxable' | 'cgst' | 'sgst' | 'igst') => rows.reduce((s, r) => s + r.c[k], 0)
  const raw = sum('taxable') + sum('cgst') + sum('sgst') + sum('igst')
  const total = Math.round(raw)

  const addPart = (item: Item) => {
    const at = lines.findIndex((l) => l.item === item.id)
    if (at >= 0) return setLines(lines.map((l, i) => (i === at ? { ...l, qty: String(num(l.qty) + 1) } : l)))
    setLines([...lines, {
      item: item.id, part_number: item.part_number, name: item.name, stock: Number(item.stock ?? 0), qty: '1',
      rate: String(Number(item.sale_price)), discount: '0', gst_rate: Number(item.gst_rate), list_price: Number(item.sale_price),
    }])
  }
  const setLine = (idx: number, k: keyof BillLine, v: string) => setLines(lines.map((l, i) => (i === idx ? { ...l, [k]: v } : l)))

  const save = async () => {
    setError('')
    if (!lines.length) return setError('Add at least one part to the bill.')
    const over = lines.find((l) => num(l.qty) > l.stock)
    if (over) return setError(`${over.part_number}: only ${over.stock} in stock.`)
    if (mode === 'CREDIT' && !customer) return setError('Choose a customer for a credit sale.')
    setBusy(true)
    try {
      const inv = await api<Invoice>('/sales/invoices/', {
        method: 'POST',
        body: JSON.stringify({
          customer: customer ? customer.id : null,
          payment_mode: mode,
          paid: mode === 'CREDIT' ? paidNow || '0' : undefined,
          lines: lines.map((l) => ({ item: l.item, qty: l.qty, rate: l.rate, discount: l.discount || '0' })),
        }),
      })
      onSaved(inv.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the bill.')
      setBusy(false)
    }
  }

  useEffect(() => {
    saveRef.current = save
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus() }
      else if (e.key === 'F4') { e.preventDefault(); customerRef.current?.focus() }
      else if (e.key === 'F9') { e.preventDefault(); saveRef.current() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const pill = (on: boolean) => `rounded-full px-4 py-1.5 font-semibold ${on ? 'bg-[#3b82f6] text-white' : 'border border-slate-400 bg-transparent text-white'}`

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-[2] flex-col gap-3">
        <PartPicker onPick={addPart} inputRef={searchRef} />
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-bold">Bill lines</h2>
          {lines.length === 0 ? (
            <p className="py-8 text-center text-slate-600">Press F2 and search for a part to start the bill.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead><tr className="bg-slate-50 text-slate-600"><th className="p-2">Part</th><th className="p-2 text-right">Stock</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">Disc. ₹</th><th className="p-2 text-right">GST</th><th className="p-2 text-right">Amount</th><th className="p-2"></th></tr></thead>
              <tbody>
                {rows.map(({ l, c }, idx) => {
                  const gross = num(l.qty) * num(l.rate)
                  const pct = gross > 0 ? (num(l.discount) / gross) * 100 : 0
                  const tooMuch = user?.role === 'COUNTER' && !!config && pct > config.counter_max_discount_percent
                  return (
                    <tr key={l.item} className="border-b border-slate-100 align-top">
                      <td className="p-2"><span className="block font-semibold">{l.part_number}</span><span className="text-slate-600">{l.name}</span></td>
                      <td className="p-2 text-right"><span className={num(l.qty) > l.stock ? 'font-semibold text-red-800' : ''}>{l.stock}</span></td>
                      <td className="p-2 text-right"><input aria-label="Quantity" type="number" min="0" step="1" value={l.qty} onChange={(e) => setLine(idx, 'qty', e.target.value)} className={cell} /></td>
                      <td className="p-2 text-right"><input aria-label="Rate" type="number" min="0" step="0.01" disabled={!isOwner} value={l.rate} onChange={(e) => setLine(idx, 'rate', e.target.value)} className={cell} /></td>
                      <td className="p-2 text-right">
                        <input aria-label="Discount in rupees" type="number" min="0" step="0.01" value={l.discount} onChange={(e) => setLine(idx, 'discount', e.target.value)} className={cell} />
                        {pct > 0 && <span className={`block text-xs ${tooMuch ? 'font-semibold text-red-800' : 'text-slate-600'}`}>{pct.toFixed(1)}%{tooMuch ? ' needs owner' : ''}</span>}
                      </td>
                      <td className="p-2 text-right">{l.gst_rate}%</td>
                      <td className="p-2 text-right font-semibold">{money(c.amount)}</td>
                      <td className="p-2"><button aria-label="Remove line" onClick={() => setLines(lines.filter((_, i) => i !== idx))} className="px-2 text-slate-600 hover:text-red-800">✕</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-slate-600"><span className={key}>F2</span> search · <span className={key}>F4</span> customer · <span className={key}>F9</span> save and print</p>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:min-w-80">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 font-bold">Customer</h2>
          <div className="flex gap-2">
            <select ref={customerRef} aria-label="Customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-400 px-3 py-2">
              <option value="">Walk-in customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={() => setShowCustomer(true)} className={btn}>+ New</button>
          </div>
          {customer && (
            <p className="mt-2 text-sm text-slate-600">
              Owes {money(customer.outstanding ?? 0)} · Credit limit {money(customer.credit_limit)}
              {inter && <span className="ml-1 font-semibold text-amber-900">· Other state: IGST applies</span>}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-[#0f1f36] p-4 text-white">
          <div className="flex justify-between py-1"><span>Taxable value</span><span>{money(sum('taxable'))}</span></div>
          {inter ? (
            <div className="flex justify-between py-1"><span>IGST</span><span>{money(sum('igst'))}</span></div>
          ) : (
            <>
              <div className="flex justify-between py-1"><span>CGST</span><span>{money(sum('cgst'))}</span></div>
              <div className="flex justify-between py-1"><span>SGST</span><span>{money(sum('sgst'))}</span></div>
            </>
          )}
          <div className="flex justify-between py-1"><span>Round off</span><span>{money(total - raw)}</span></div>
          <div className="mt-2 flex justify-between border-t border-[#5b7ba6] pt-3 text-2xl font-bold"><span>Total</span><span>{money(total)}</span></div>

          <div className="my-4 flex gap-2" role="group" aria-label="Payment mode">
            {(['CASH', 'UPI', 'CREDIT'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} className={pill(mode === m)}>{m === 'CASH' ? 'Cash' : m === 'UPI' ? 'UPI' : 'Credit'}</button>
            ))}
          </div>
          {mode === 'CREDIT' && (
            <div className="mb-4">
              <label htmlFor="paidnow" className="mb-1 block text-sm">Amount received now (₹)</label>
              <input id="paidnow" type="number" min="0" value={paidNow} onChange={(e) => setPaidNow(e.target.value)} placeholder="0" className="w-full rounded-lg border border-slate-400 px-3 py-2 text-slate-900" />
              <p className="mt-1 text-xs text-slate-300">Balance goes to the customer's outstanding.</p>
            </div>
          )}
          <button onClick={save} disabled={busy} className="w-full rounded-lg bg-[#3b82f6] px-4 py-3 text-lg font-semibold text-white disabled:opacity-60">
            {busy ? 'Saving…' : 'Save and print (F9)'}
          </button>
        </div>
        {error && <p role="alert" className="font-semibold text-red-800">{error}</p>}
        <p className="text-xs text-slate-600">Totals here are a preview. The final bill is calculated when you save.</p>
      </div>

      {showCustomer && <CustomerModal onClose={() => setShowCustomer(false)} onSaved={(c) => { setCustomers([...customers, c].sort((a, b) => a.name.localeCompare(b.name))); setCustomerId(String(c.id)); setShowCustomer(false) }} />}
    </div>
  )
}

function RecentBills({ onOpen }: { onOpen: (id: number) => void }) {
  const [q, setQ] = useState('')
  const [date, setDate] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Page<Invoice> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams({ page: String(page) })
      if (q) p.set('q', q)
      if (date) p.set('date', date)
      api<Page<Invoice>>(`/sales/invoices/?${p}`).then(setData).catch((e: Error) => setError(e.message))
    }, 200)
    return () => clearTimeout(t)
  }, [q, date, page])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap gap-3">
        <input aria-label="Search bills" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search bill number or customer…" className="min-w-64 flex-1 rounded-lg border border-slate-400 px-3 py-2" />
        <input aria-label="Bill date" type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1) }} className="rounded-lg border border-slate-400 px-3 py-2" />
      </div>
      {error && <p role="alert" className="font-semibold text-red-800">{error}</p>}
      {data && data.results.length === 0 ? (
        <p className="py-8 text-center text-slate-600">No bills found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="bg-slate-50 text-slate-600"><th className="p-2">Bill</th><th className="p-2">Date</th><th className="p-2">Customer</th><th className="p-2">Payment</th><th className="p-2 text-right">Total</th><th className="p-2 text-right">Due</th></tr></thead>
            <tbody>
              {data?.results.map((i) => (
                <tr key={i.id} className="border-b border-slate-100">
                  <td className="p-2"><button onClick={() => onOpen(i.id)} className="font-semibold text-[#1b4f9c] underline">{i.number}</button></td>
                  <td className="p-2">{new Date(i.created_at).toLocaleString('en-IN')}</td>
                  <td className="p-2">{i.customer?.name ?? 'Walk-in'}</td>
                  <td className="p-2">{i.payment_mode.toLowerCase()}</td>
                  <td className="p-2 text-right">{money(i.total)}</td>
                  <td className="p-2 text-right">{Number(i.due) > 0 ? money(i.due) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40">Previous</button>
        <button disabled={!data || page * 25 >= data.count} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40">Next</button>
      </div>
    </div>
  )
}
