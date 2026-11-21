import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import type { Supplier } from '../purchasing'
import Modal from './Modal'

const input = 'w-full rounded-lg border border-slate-400 px-3 py-2'

export default function SupplierModal({ onClose, onSaved }: { onClose: () => void; onSaved: (s: Supplier) => void }) {
  const [f, setF] = useState({ name: '', phone: '', gstin: '', address: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      onSaved(await api<Supplier>('/parties/suppliers/', { method: 'POST', body: JSON.stringify(f) }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the supplier.')
      setBusy(false)
    }
  }

  return (
    <Modal title="New supplier" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div><label htmlFor="sname" className="mb-1 block text-sm font-semibold">Name</label><input id="sname" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={input} /></div>
        <div><label htmlFor="sphone" className="mb-1 block text-sm font-semibold">Phone</label><input id="sphone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={input} /></div>
        <div><label htmlFor="sgstin" className="mb-1 block text-sm font-semibold">GSTIN (optional)</label><input id="sgstin" value={f.gstin} maxLength={15} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} className={input} /></div>
        <div><label htmlFor="saddr" className="mb-1 block text-sm font-semibold">Address (optional)</label><input id="saddr" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className={input} /></div>
        {error && <p role="alert" className="text-sm font-semibold text-red-800">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#1f5fbf] px-4 py-2 font-semibold text-[#1b4f9c]">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-[#1f5fbf] px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : 'Save supplier'}</button>
        </div>
      </form>
    </Modal>
  )
}
