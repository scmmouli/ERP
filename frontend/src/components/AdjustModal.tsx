import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import type { Item } from '../catalog'
import Modal from './Modal'

export default function AdjustModal({ item, onClose, onDone }: { item: Item; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('/inventory/adjustments/', { method: 'POST', body: JSON.stringify({ item: item.id, qty, reason }) })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not adjust stock.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Adjust stock" onClose={onClose}>
      <p className="mb-1 font-semibold">{item.part_number}</p>
      <p className="mb-4 text-sm text-slate-600">{item.name}. Current stock: {Number(item.stock ?? 0)}</p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="qty" className="mb-1 block text-sm font-semibold">Change in quantity</label>
          <input id="qty" type="number" step="0.01" required value={qty} onChange={(e) => setQty(e.target.value)} className="w-full rounded-lg border border-slate-400 px-3 py-2" />
          <p className="mt-1 text-xs text-slate-600">Use a minus number to reduce stock, for example -2 for two damaged pieces.</p>
        </div>
        <div>
          <label htmlFor="reason" className="mb-1 block text-sm font-semibold">Reason</label>
          <input id="reason" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Stock count correction, damaged, found…" className="w-full rounded-lg border border-slate-400 px-3 py-2" />
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-red-800">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#1f5fbf] px-4 py-2 font-semibold text-[#1b4f9c]">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-[#1f5fbf] px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : 'Save adjustment'}</button>
        </div>
      </form>
    </Modal>
  )
}
