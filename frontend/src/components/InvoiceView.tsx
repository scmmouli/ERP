import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import { money } from '../purchasing'
import type { Invoice } from '../sales'
import Modal from './Modal'

const btn = 'rounded-lg border border-[#1f5fbf] bg-white px-4 py-2 font-semibold text-[#1b4f9c]'
const pri = 'rounded-lg bg-[#1f5fbf] px-4 py-2 font-semibold text-white'

function ReturnModal({ invoice, onClose, onDone }: { invoice: Invoice; onClose: () => void; onDone: (i: Invoice) => void }) {
  const [qty, setQty] = useState<Record<number, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const lines = Object.entries(qty).filter(([, v]) => Number(v) > 0).map(([line, v]) => ({ line: Number(line), qty: v }))
    if (!lines.length) return setError('Enter a quantity for at least one item.')
    setBusy(true)
    setError('')
    try {
      onDone(await api<Invoice>(`/sales/invoices/${invoice.id}/return/`, { method: 'POST', body: JSON.stringify({ lines }) }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the return.')
      setBusy(false)
    }
  }

  return (
    <Modal title={`Return items from ${invoice.number}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {invoice.lines.map((l) => {
          const left = Number(l.qty) - Number(l.returned_qty)
          return (
            <div key={l.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
              <div className="text-sm"><span className="block font-semibold">{l.part_number}</span><span className="text-slate-600">{l.item_name}. Can return {left}</span></div>
              <input aria-label={`Return quantity for ${l.part_number}`} type="number" min="0" max={left} step="0.01" disabled={left <= 0}
                value={qty[l.id] ?? ''} onChange={(e) => setQty({ ...qty, [l.id]: e.target.value })}
                className="w-24 rounded-lg border border-slate-400 px-2 py-1.5 text-right disabled:bg-slate-100" />
            </div>
          )
        })}
        <p className="text-xs text-slate-600">Returned parts go back into stock, and a credit note is recorded against this bill.</p>
        {error && <p role="alert" className="text-sm font-semibold text-red-800">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btn}>Cancel</button>
          <button type="submit" disabled={busy} className={pri + ' disabled:opacity-60'}>{busy ? 'Saving…' : 'Record return'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function InvoiceView({ id, onBack, onNew }: { id: number; onBack: () => void; onNew: () => void }) {
  const [inv, setInv] = useState<Invoice | null>(null)
  const [error, setError] = useState('')
  const [returning, setReturning] = useState(false)

  useEffect(() => {
    api<Invoice>(`/sales/invoices/${id}/`).then(setInv).catch((e: Error) => setError(e.message))
  }, [id])

  if (error) return <p role="alert" className="font-semibold text-red-800">{error}</p>
  if (!inv) return <p className="text-slate-600">Loading…</p>

  const whatsapp = () => {
    const digits = (inv.customer?.phone ?? '').replace(/\D/g, '')
    const to = digits.length === 10 ? `91${digits}` : digits
    const text = encodeURIComponent(`Invoice ${inv.number} from ${inv.shop.name}\nTotal: ${money(inv.total)}\nThank you for your business.`)
    window.open(`https://wa.me/${to}?text=${text}`, '_blank', 'noopener')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button onClick={onBack} className={btn}>← Bills</button>
        <button onClick={() => window.print()} className={pri}>Print</button>
        <button onClick={whatsapp} className={btn}>Share on WhatsApp</button>
        <button onClick={() => setReturning(true)} className={btn}>Return items</button>
        <button onClick={onNew} className={btn + ' ml-auto'}>+ New bill</button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 print:rounded-none print:border-0 print:p-0">
        <div className="mb-6 flex justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold">{inv.shop.name}</h1>
            {inv.shop.address && <p className="text-sm text-slate-600">{inv.shop.address}</p>}
            {inv.shop.phone && <p className="text-sm text-slate-600">Phone: {inv.shop.phone}</p>}
            {inv.shop.gstin && <p className="text-sm text-slate-600">GSTIN: {inv.shop.gstin}</p>}
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">TAX INVOICE</p>
            <p className="font-semibold">{inv.number}</p>
            <p className="text-sm text-slate-600">{new Date(inv.created_at).toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="mb-4 text-sm">
          <p className="text-slate-600">Billed to</p>
          <p className="font-semibold">{inv.customer?.name ?? 'Walk-in customer'}</p>
          {inv.customer?.address && <p>{inv.customer.address}</p>}
          {inv.customer?.phone && <p>Phone: {inv.customer.phone}</p>}
          {inv.customer?.gstin && <p>GSTIN: {inv.customer.gstin}</p>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-y-2 border-slate-900"><th className="p-2">#</th><th className="p-2">Item</th><th className="p-2">HSN</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">Disc.</th><th className="p-2 text-right">Taxable</th><th className="p-2 text-right">GST</th><th className="p-2 text-right">Amount</th></tr></thead>
            <tbody>
              {inv.lines.map((l, i) => (
                <tr key={l.id} className="border-b border-slate-200">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2"><span className="block font-semibold">{l.part_number}</span>{l.item_name}</td>
                  <td className="p-2">{l.hsn_code || '—'}</td>
                  <td className="p-2 text-right">{Number(l.qty)}</td>
                  <td className="p-2 text-right">{money(l.rate)}</td>
                  <td className="p-2 text-right">{money(l.discount)}</td>
                  <td className="p-2 text-right">{money(l.taxable)}</td>
                  <td className="p-2 text-right">{Number(l.gst_rate)}%</td>
                  <td className="p-2 text-right font-semibold">{money(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto mt-4 w-full max-w-xs text-sm">
          <div className="flex justify-between py-1"><span>Taxable value</span><span>{money(inv.subtotal)}</span></div>
          {inv.inter_state ? (
            <div className="flex justify-between py-1"><span>IGST</span><span>{money(inv.igst)}</span></div>
          ) : (
            <>
              <div className="flex justify-between py-1"><span>CGST</span><span>{money(inv.cgst)}</span></div>
              <div className="flex justify-between py-1"><span>SGST</span><span>{money(inv.sgst)}</span></div>
            </>
          )}
          <div className="flex justify-between py-1"><span>Round off</span><span>{money(inv.round_off)}</span></div>
          <div className="mt-1 flex justify-between border-t-2 border-slate-900 pt-2 text-lg font-bold"><span>Total</span><span>{money(inv.total)}</span></div>
          <div className="flex justify-between py-1"><span>Paid ({inv.payment_mode.toLowerCase()})</span><span>{money(inv.paid)}</span></div>
          {Number(inv.due) > 0 && <div className="flex justify-between py-1 font-semibold"><span>Balance due</span><span>{money(inv.due)}</span></div>}
        </div>

        {inv.returns.length > 0 && (
          <div className="mt-6 border-t border-slate-300 pt-3 text-sm">
            <p className="font-semibold">Returns</p>
            {inv.returns.map((r) => (
              <p key={r.id}>{r.number}: credit {money(r.credit_amount)} on {new Date(r.created_at).toLocaleDateString('en-IN')}</p>
            ))}
          </div>
        )}
        <p className="mt-8 text-xs text-slate-600">Billed by {inv.user}. This is a computer generated invoice.</p>
      </div>

      {returning && <ReturnModal invoice={inv} onClose={() => setReturning(false)} onDone={(i) => { setInv(i); setReturning(false) }} />}
    </div>
  )
}
