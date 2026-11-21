import { useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { api } from '../api'
import type { Item } from '../catalog'
import Modal from './Modal'

const input = 'w-full rounded-lg border border-slate-400 px-3 py-2'

export default function ItemForm({ item, brands, onClose, onSaved }: {
  item: Item | null
  brands: string[]
  onClose: () => void
  onSaved: (item: Item) => void
}) {
  const [f, setF] = useState({
    part_number: item?.part_number ?? '',
    name: item?.name ?? '',
    brand: item?.brand ?? '',
    type: item?.is_oem ? 'OEM' : 'Aftermarket',
    hsn_code: item?.hsn_code ?? '',
    gst_rate: String(Number(item?.gst_rate ?? 18)),
    mrp: item?.mrp ?? '0',
    sale_price: item?.sale_price ?? '0',
    rack: item?.rack ?? '',
    reorder_level: String(item?.reorder_level ?? 0),
    barcode: item?.barcode ?? '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { type, ...rest } = f
    const body = JSON.stringify({ ...rest, is_oem: type === 'OEM', reorder_level: Number(f.reorder_level) })
    try {
      const saved = item
        ? await api<Item>(`/catalog/items/${item.id}/`, { method: 'PATCH', body })
        : await api<Item>('/catalog/items/', { method: 'POST', body })
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
      setBusy(false)
    }
  }

  const field = (label: string, id: keyof typeof f, el: ReactNode) => (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">{label}</label>
      {el}
    </div>
  )

  return (
    <Modal title={item ? 'Edit item' : 'New item'} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-2 gap-4">
        {field('Part number', 'part_number', <input id="part_number" required value={f.part_number} onChange={set('part_number')} className={input} />)}
        {field('Name', 'name', <input id="name" required value={f.name} onChange={set('name')} className={input} />)}
        {field('Brand', 'brand', <>
          <input id="brand" list="brand-list" value={f.brand} onChange={set('brand')} className={input} />
          <datalist id="brand-list">{brands.map((b) => <option key={b} value={b} />)}</datalist>
        </>)}
        {field('Type', 'type', <select id="type" value={f.type} onChange={set('type')} className={input}><option>Aftermarket</option><option>OEM</option></select>)}
        {field('HSN code', 'hsn_code', <input id="hsn_code" value={f.hsn_code} maxLength={8} onChange={set('hsn_code')} className={input} />)}
        {field('GST rate', 'gst_rate', <select id="gst_rate" value={f.gst_rate} onChange={set('gst_rate')} className={input}>{[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}</select>)}
        {field('MRP (₹)', 'mrp', <input id="mrp" type="number" min="0" step="0.01" value={f.mrp} onChange={set('mrp')} className={input} />)}
        {field('Sale price (₹)', 'sale_price', <input id="sale_price" type="number" min="0" step="0.01" value={f.sale_price} onChange={set('sale_price')} className={input} />)}
        {field('Rack', 'rack', <input id="rack" value={f.rack} onChange={set('rack')} className={input} />)}
        {field('Reorder level', 'reorder_level', <input id="reorder_level" type="number" min="0" value={f.reorder_level} onChange={set('reorder_level')} className={input} />)}
        {field('Barcode', 'barcode', <input id="barcode" value={f.barcode} onChange={set('barcode')} className={input} />)}
        {error && <p role="alert" className="col-span-2 text-sm font-semibold text-red-800">{error}</p>}
        <div className="col-span-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#1f5fbf] px-4 py-2 font-semibold text-[#1b4f9c]">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-[#1f5fbf] px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : 'Save item'}</button>
        </div>
      </form>
    </Modal>
  )
}
