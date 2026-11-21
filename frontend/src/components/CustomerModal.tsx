import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import type { Customer } from '../sales'
import Modal from './Modal'

const input = 'w-full rounded-lg border border-slate-400 px-3 py-2'

export default function CustomerModal({ customer, onClose, onSaved }: { customer?: Customer | null; onClose: () => void; onSaved: (c: Customer) => void }) {
  const [f, setF] = useState({
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    kind: customer?.kind ?? 'GARAGE',
    gstin: customer?.gstin ?? '',
    state_code: customer?.state_code ?? '33',
    address: customer?.address ?? '',
    credit_limit: String(Number(customer?.credit_limit ?? 0)),
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const body = JSON.stringify(f)
    try {
      onSaved(
        customer
          ? await api<Customer>(`/parties/customers/${customer.id}/`, { method: 'PATCH', body })
          : await api<Customer>('/parties/customers/', { method: 'POST', body }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the customer.')
      setBusy(false)
    }
  }

  return (
    <Modal title={customer ? 'Edit customer' : 'New customer'} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-2 gap-4">
        <div><label htmlFor="cname" className="mb-1 block text-sm font-semibold">Name</label><input id="cname" required value={f.name} onChange={set('name')} className={input} /></div>
        <div><label htmlFor="cphone" className="mb-1 block text-sm font-semibold">Phone</label><input id="cphone" value={f.phone} onChange={set('phone')} className={input} /></div>
        <div>
          <label htmlFor="ckind" className="mb-1 block text-sm font-semibold">Type</label>
          <select id="ckind" value={f.kind} onChange={set('kind')} className={input}><option value="GARAGE">Garage</option><option value="MECHANIC">Mechanic</option><option value="RETAIL">Retail</option></select>
        </div>
        <div><label htmlFor="cgstin" className="mb-1 block text-sm font-semibold">GSTIN (optional)</label><input id="cgstin" maxLength={15} value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} className={input} /></div>
        <div>
          <label htmlFor="cstate" className="mb-1 block text-sm font-semibold">GST state code</label>
          <input id="cstate" maxLength={2} value={f.state_code} onChange={set('state_code')} className={input} />
          <p className="mt-1 text-xs text-slate-600">33 is Tamil Nadu. Other states are billed with IGST.</p>
        </div>
        <div>
          <label htmlFor="climit" className="mb-1 block text-sm font-semibold">Credit limit (₹)</label>
          <input id="climit" type="number" min="0" value={f.credit_limit} onChange={set('credit_limit')} className={input} />
          <p className="mt-1 text-xs text-slate-600">0 means no credit sales.</p>
        </div>
        <div className="col-span-2"><label htmlFor="caddr" className="mb-1 block text-sm font-semibold">Address (optional)</label><input id="caddr" value={f.address} onChange={set('address')} className={input} /></div>
        {error && <p role="alert" className="col-span-2 text-sm font-semibold text-red-800">{error}</p>}
        <div className="col-span-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#1f5fbf] px-4 py-2 font-semibold text-[#1b4f9c]">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-[#1f5fbf] px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : 'Save customer'}</button>
        </div>
      </form>
    </Modal>
  )
}
