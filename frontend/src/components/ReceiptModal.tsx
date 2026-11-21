import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import { money } from '../purchasing'
import Modal from './Modal'

export default function ReceiptModal({ customerId, name, owed, onClose, onDone }: {
  customerId: number
  name: string
  owed: number
  onClose: () => void
  onDone: () => void
}) {
  const [amount, setAmount] = useState(String(owed))
  const [mode, setMode] = useState('CASH')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('/payments/receipts/', { method: 'POST', body: JSON.stringify({ customer: customerId, amount, mode, note }) })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the payment.')
      setBusy(false)
    }
  }

  const input = 'w-full rounded-lg border border-slate-400 px-3 py-2'
  return (
    <Modal title="Receive payment" onClose={onClose}>
      <p className="mb-4 text-sm text-slate-600">{name} owes {money(owed)}. Payments are applied to the oldest bills first.</p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="ramt" className="mb-1 block text-sm font-semibold">Amount received (₹)</label>
          <input id="ramt" type="number" min="0.01" step="0.01" max={owed} required autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="rmode" className="mb-1 block text-sm font-semibold">Mode</label>
          <select id="rmode" value={mode} onChange={(e) => setMode(e.target.value)} className={input}>
            <option value="CASH">Cash</option><option value="UPI">UPI</option><option value="BANK">Bank transfer</option>
          </select>
        </div>
        <div>
          <label htmlFor="rnote" className="mb-1 block text-sm font-semibold">Note (optional)</label>
          <input id="rnote" value={note} onChange={(e) => setNote(e.target.value)} placeholder="UPI reference, cheque number…" className={input} />
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-red-800">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#1f5fbf] px-4 py-2 font-semibold text-[#1b4f9c]">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-[#1f5fbf] px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : 'Record payment'}</button>
        </div>
      </form>
    </Modal>
  )
}
