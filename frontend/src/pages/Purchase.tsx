import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Item, Page } from '../catalog'
import PartPicker from '../components/PartPicker'
import SupplierModal from '../components/SupplierModal'
import { money } from '../purchasing'
import type { GRN, Supplier } from '../purchasing'

const num = (s: string) => Number(s) || 0
const btn = 'rounded-lg border border-[#1f5fbf] bg-white px-4 py-2 font-semibold text-[#1b4f9c] disabled:opacity-50'
const pri = 'rounded-lg bg-[#1f5fbf] px-4 py-2 font-semibold text-white disabled:opacity-50'
const cell = 'w-24 rounded-lg border border-slate-400 px-2 py-1.5 text-right disabled:bg-slate-100'

export default function Purchase() {
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  return editing === null ? <GRNList onOpen={setEditing} /> : <GRNEditor id={editing} onBack={() => setEditing(null)} />
}

function StatusBadge({ status }: { status: GRN['status'] }) {
  return (
    <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${status === 'POSTED' ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-900'}`}>
      {status === 'POSTED' ? 'Posted' : 'Draft'}
    </span>
  )
}

function GRNList({ onOpen }: { onOpen: (id: number | 'new') => void }) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Page<GRN> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Page<GRN>>(`/purchasing/grns/?page=${page}`).then(setData).catch((e: Error) => setError(e.message))
  }, [page])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Purchase Entry (GRN)</h1>
          <p className="text-sm text-slate-600">Receive goods from suppliers and add them to stock.</p>
        </div>
        <button onClick={() => onOpen('new')} className={pri}>+ New receipt</button>
      </div>
      {error && <p role="alert" className="font-semibold text-red-800">{error}</p>}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4">
        {data && data.results.length === 0 ? (
          <p className="py-8 text-center text-slate-600">No receipts yet. Create one when goods arrive.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead><tr className="bg-slate-50 text-slate-600"><th className="p-2">Receipt</th><th className="p-2">Supplier</th><th className="p-2">Invoice</th><th className="p-2">Date</th><th className="p-2 text-right">Total</th><th className="p-2">Status</th></tr></thead>
            <tbody>
              {data?.results.map((g) => (
                <tr key={g.id} className="border-b border-slate-100">
                  <td className="p-2"><button onClick={() => onOpen(g.id)} className="font-semibold text-[#1b4f9c] underline">{g.number}</button></td>
                  <td className="p-2">{g.supplier_name}</td>
                  <td className="p-2">{g.supplier_invoice_no || '—'}</td>
                  <td className="p-2">{new Date(g.created_at).toLocaleDateString('en-IN')}</td>
                  <td className="p-2 text-right">{money(g.total)}</td>
                  <td className="p-2"><StatusBadge status={g.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40">Previous</button>
          <button disabled={!data || page * 25 >= data.count} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  )
}

interface Line {
  item: number
  part_number: string
  item_name: string
  gst_rate: number
  qty_ordered: string
  qty_received: string
  unit_cost: string
}

function GRNEditor({ id, onBack }: { id: number | 'new'; onBack: () => void }) {
  const [grnId, setGrnId] = useState<number | null>(id === 'new' ? null : id)
  const [number, setNumber] = useState('')
  const [status, setStatus] = useState<GRN['status']>('DRAFT')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [showSupplier, setShowSupplier] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const apply = (g: GRN) => {
    setGrnId(g.id)
    setNumber(g.number)
    setStatus(g.status)
    setSupplierId(String(g.supplier))
    setInvoiceNo(g.supplier_invoice_no)
    setInvoiceDate(g.supplier_invoice_date ?? '')
    setLines(g.lines.map((l) => ({
      item: l.item, part_number: l.part_number, item_name: l.item_name, gst_rate: Number(l.gst_rate),
      qty_ordered: l.qty_ordered == null ? '' : String(Number(l.qty_ordered)),
      qty_received: String(Number(l.qty_received)), unit_cost: String(Number(l.unit_cost)),
    })))
  }

  useEffect(() => {
    api<Supplier[]>('/parties/suppliers/').then(setSuppliers).catch((e: Error) => setError(e.message))
    if (id !== 'new') api<GRN>(`/purchasing/grns/${id}/`).then(apply).catch((e: Error) => setError(e.message))
  }, [id])

  const readOnly = status === 'POSTED'
  const taxable = lines.reduce((s, l) => s + num(l.qty_received) * num(l.unit_cost), 0)
  const gst = lines.reduce((s, l) => s + (num(l.qty_received) * num(l.unit_cost) * l.gst_rate) / 100, 0)

  const addPart = (item: Item) =>
    setLines([...lines, { item: item.id, part_number: item.part_number, item_name: item.name, gst_rate: Number(item.gst_rate), qty_ordered: '', qty_received: '1', unit_cost: '' }])
  const setLine = (idx: number, key: keyof Line, value: string) =>
    setLines(lines.map((l, i) => (i === idx ? { ...l, [key]: value } : l)))

  const save = async (): Promise<GRN | null> => {
    if (!supplierId) { setError('Choose a supplier.'); return null }
    if (!lines.length) { setError('Add at least one part.'); return null }
    setBusy(true)
    setError('')
    setMsg('')
    const body = JSON.stringify({
      supplier: Number(supplierId),
      supplier_invoice_no: invoiceNo,
      supplier_invoice_date: invoiceDate || null,
      lines: lines.map((l) => ({
        item: l.item,
        qty_ordered: l.qty_ordered === '' ? null : l.qty_ordered,
        qty_received: l.qty_received || '0',
        unit_cost: l.unit_cost || '0',
      })),
    })
    try {
      const g = grnId
        ? await api<GRN>(`/purchasing/grns/${grnId}/`, { method: 'PATCH', body })
        : await api<GRN>('/purchasing/grns/', { method: 'POST', body })
      apply(g)
      return g
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
      return null
    } finally {
      setBusy(false)
    }
  }

  const saveDraft = async () => {
    if (await save()) setMsg('Draft saved.')
  }

  const post = async () => {
    if (!window.confirm('Post this receipt? Stock will be added and the receipt can no longer be edited.')) return
    const g = await save()
    if (!g) return
    setBusy(true)
    try {
      apply(await api<GRN>(`/purchasing/grns/${g.id}/post/`, { method: 'POST' }))
      setMsg('Posted. Stock has been updated.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!grnId || !window.confirm('Delete this draft?')) return
    try {
      await api(`/purchasing/grns/${grnId}/`, { method: 'DELETE' })
      onBack()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className={btn}>← Back</button>
          <h1 className="text-2xl font-bold">{number || 'New receipt'}</h1>
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3">
        <div>
          <label htmlFor="supplier" className="mb-1 block text-sm font-semibold">Supplier</label>
          <div className="flex gap-2">
            <select id="supplier" disabled={readOnly} value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-400 px-3 py-2 disabled:bg-slate-100">
              <option value="">Select supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {!readOnly && <button type="button" onClick={() => setShowSupplier(true)} className={btn}>+ New</button>}
          </div>
        </div>
        <div>
          <label htmlFor="invno" className="mb-1 block text-sm font-semibold">Supplier invoice no.</label>
          <input id="invno" disabled={readOnly} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="w-full rounded-lg border border-slate-400 px-3 py-2 disabled:bg-slate-100" />
        </div>
        <div>
          <label htmlFor="invdate" className="mb-1 block text-sm font-semibold">Invoice date</label>
          <input id="invdate" type="date" disabled={readOnly} value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="w-full rounded-lg border border-slate-400 px-3 py-2 disabled:bg-slate-100" />
        </div>
      </div>

      {!readOnly && <PartPicker onPick={addPart} />}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-bold">Goods received</h2>
        {lines.length === 0 ? (
          <p className="py-6 text-center text-slate-600">Search for a part above to add it.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead><tr className="bg-slate-50 text-slate-600"><th className="p-2">Part</th><th className="p-2 text-right">Ordered</th><th className="p-2 text-right">Received</th><th className="p-2 text-right">Cost (₹)</th><th className="p-2 text-right">GST</th><th className="p-2 text-right">Amount</th><th className="p-2">Status</th><th className="p-2"></th></tr></thead>
            <tbody>
              {lines.map((l, idx) => {
                const short = l.qty_ordered !== '' && num(l.qty_received) < num(l.qty_ordered)
                const amt = num(l.qty_received) * num(l.unit_cost) * (1 + l.gst_rate / 100)
                return (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="p-2"><span className="block font-semibold">{l.part_number}</span><span className="text-slate-600">{l.item_name}</span></td>
                    <td className="p-2 text-right"><input aria-label="Quantity ordered" type="number" min="0" disabled={readOnly} value={l.qty_ordered} onChange={(e) => setLine(idx, 'qty_ordered', e.target.value)} className={cell} /></td>
                    <td className="p-2 text-right"><input aria-label="Quantity received" type="number" min="0" disabled={readOnly} value={l.qty_received} onChange={(e) => setLine(idx, 'qty_received', e.target.value)} className={cell} /></td>
                    <td className="p-2 text-right"><input aria-label="Unit cost" type="number" min="0" step="0.01" disabled={readOnly} value={l.unit_cost} onChange={(e) => setLine(idx, 'unit_cost', e.target.value)} className={cell} /></td>
                    <td className="p-2 text-right">{l.gst_rate}%</td>
                    <td className="p-2 text-right font-semibold">{money(amt)}</td>
                    <td className="p-2">{short ? <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">Short by {num(l.qty_ordered) - num(l.qty_received)}</span> : <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-900">OK</span>}</td>
                    <td className="p-2">{!readOnly && <button aria-label="Remove line" onClick={() => setLines(lines.filter((_, i) => i !== idx))} className="px-2 text-slate-600 hover:text-red-800">✕</button>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {error && <p role="alert" className="font-semibold text-red-800">{error}</p>}
      {msg && <p role="status" className="font-semibold text-green-800">{msg}</p>}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-2">
          {!readOnly && grnId && <button onClick={remove} className={btn}>Delete draft</button>}
        </div>
        <div className="min-w-80 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex justify-between py-1"><span>Taxable</span><span>{money(taxable)}</span></div>
          <div className="flex justify-between py-1"><span>GST</span><span>{money(gst)}</span></div>
          <div className="mt-2 flex justify-between border-t-2 border-slate-900 pt-3 text-xl font-bold"><span>Total payable</span><span>{money(taxable + gst)}</span></div>
          {!readOnly && (
            <div className="mt-4 flex justify-end gap-2">
              <button disabled={busy} onClick={saveDraft} className={btn}>Save draft</button>
              <button disabled={busy} onClick={post} className={pri}>Post GRN (adds stock)</button>
            </div>
          )}
        </div>
      </div>

      {showSupplier && (
        <SupplierModal
          onClose={() => setShowSupplier(false)}
          onSaved={(s) => {
            setSuppliers([...suppliers, s].sort((a, b) => a.name.localeCompare(b.name)))
            setSupplierId(String(s.id))
            setShowSupplier(false)
          }}
        />
      )}
    </div>
  )
}
