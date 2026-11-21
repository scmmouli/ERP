import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { rupees, vehicleLabel } from '../catalog'
import type { Item, Page } from '../catalog'
import ImportModal from '../components/ImportModal'
import ItemForm from '../components/ItemForm'

const PAGE_SIZE = 25
const pill = 'inline-block rounded-full border border-slate-300 bg-white px-3 py-1 text-sm'

export default function Items() {
  const { user } = useAuth()
  const canEdit = user?.role === 'OWNER' || user?.role === 'STOREKEEPER'

  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [brand, setBrand] = useState('')
  const [make, setMake] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Page<Item> | null>(null)
  const [filters, setFilters] = useState<{ brands: string[]; makes: string[] }>({ brands: [], makes: [] })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [reload, setReload] = useState(0)
  const [error, setError] = useState('')
  const [formItem, setFormItem] = useState<Item | 'new' | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q)
      setPage(1)
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page) })
    if (debounced) params.set('q', debounced)
    if (brand) params.set('brand', brand)
    if (make) params.set('make', make)
    api<Page<Item>>(`/catalog/items/?${params}`)
      .then((d) => {
        setData(d)
        setError('')
      })
      .catch((e: Error) => setError(e.message))
  }, [debounced, brand, make, page, reload])

  useEffect(() => {
    api<{ brands: string[]; makes: string[] }>('/catalog/filters/').then(setFilters).catch(() => {})
  }, [reload])

  const results = data?.results ?? []
  const selected = results.find((i) => i.id === selectedId) ?? results[0] ?? null
  const total = data?.count ?? 0
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Item Search</h1>
          <p className="text-sm text-slate-600">Find parts by number, name, barcode or vehicle.</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button onClick={() => setImportOpen(true)} className="rounded-lg border border-[#1f5fbf] bg-white px-4 py-2 font-semibold text-[#1b4f9c]">Import from Excel</button>
            <button onClick={() => setFormItem('new')} className="rounded-lg bg-[#1f5fbf] px-4 py-2 font-semibold text-white">+ New item</button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          aria-label="Search parts"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search part no., alternate no., name or barcode…"
          autoFocus
          className="min-w-72 flex-1 rounded-xl border-2 border-[#1f5fbf] bg-white px-4 py-3"
        />
        <select aria-label="Brand" value={brand} onChange={(e) => { setBrand(e.target.value); setPage(1) }} className="rounded-xl border border-slate-400 bg-white px-3 py-3">
          <option value="">All brands</option>
          {filters.brands.map((b) => <option key={b}>{b}</option>)}
        </select>
        <select aria-label="Vehicle make" value={make} onChange={(e) => { setMake(e.target.value); setPage(1) }} className="rounded-xl border border-slate-400 bg-white px-3 py-3">
          <option value="">All vehicle makes</option>
          {filters.makes.map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>

      {error && <p role="alert" className="font-semibold text-red-800">{error}</p>}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-[2] rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-bold">Results <span className="ml-2 text-sm font-normal text-slate-600">{from}–{to} of {total}</span></h2>
          {results.length === 0 ? (
            <p className="py-8 text-center text-slate-600">
              {data ? 'No parts match. Try fewer words or another number.' : 'Loading…'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="p-2">Part</th><th className="p-2">Brand</th><th className="p-2">Rack</th>
                    <th className="p-2 text-right">MRP</th><th className="p-2 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((i) => (
                    <tr key={i.id} className={`border-b border-slate-100 ${selected?.id === i.id ? 'bg-blue-50' : ''}`}>
                      <td className="p-2">
                        <button onClick={() => setSelectedId(i.id)} className="text-left">
                          <span className="block font-semibold">{i.part_number}</span>
                          <span className="text-slate-600">{i.name}</span>
                        </button>
                      </td>
                      <td className="p-2">{i.brand || '—'}</td>
                      <td className="p-2">{i.rack || '—'}</td>
                      <td className="p-2 text-right">{rupees(i.mrp)}</td>
                      <td className="p-2 text-right font-semibold">{rupees(i.sale_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40">Previous</button>
            <button disabled={to >= total} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40">Next</button>
          </div>
        </div>

        {selected && (
          <aside className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 lg:min-w-72">
            <h2 className="font-bold">{selected.part_number}</h2>
            <p className="mb-2 text-slate-600">{selected.name}</p>
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-0.5 text-sm font-semibold text-blue-900">GST {Number(selected.gst_rate)}%</span>
              {selected.hsn_code && <span className="rounded-full bg-blue-100 px-3 py-0.5 text-sm font-semibold text-blue-900">HSN {selected.hsn_code}</span>}
              <span className="rounded-full bg-slate-200 px-3 py-0.5 text-sm font-semibold text-slate-800">{selected.is_oem ? 'OEM' : 'Aftermarket'}</span>
            </div>
            <dl className="mb-3 text-sm">
              <div className="flex justify-between py-1"><dt className="text-slate-600">Rack</dt><dd className="font-semibold">{selected.rack || '—'}</dd></div>
              <div className="flex justify-between py-1"><dt className="text-slate-600">Reorder level</dt><dd className="font-semibold">{selected.reorder_level}</dd></div>
              <div className="flex justify-between py-1"><dt className="text-slate-600">Barcode</dt><dd className="font-semibold">{selected.barcode || '—'}</dd></div>
            </dl>
            <h3 className="mb-1 font-bold">Cross-references</h3>
            <div className="mb-3 flex flex-wrap gap-2">
              {selected.cross_refs.length ? selected.cross_refs.map((c) => <span key={c.id} className={pill}>{c.alt_part_number}</span>) : <span className="text-sm text-slate-600">None</span>}
            </div>
            <h3 className="mb-1 font-bold">Fits vehicles</h3>
            <div className="mb-4 flex flex-wrap gap-2">
              {selected.fitments.length ? selected.fitments.map((f) => <span key={f.id} className={pill}>{vehicleLabel(f.vehicle)}</span>) : <span className="text-sm text-slate-600">None recorded</span>}
            </div>
            {canEdit && <button onClick={() => setFormItem(selected)} className="rounded-lg border border-[#1f5fbf] px-4 py-2 font-semibold text-[#1b4f9c]">Edit</button>}
          </aside>
        )}
      </div>

      {formItem && (
        <ItemForm
          item={formItem === 'new' ? null : formItem}
          brands={filters.brands}
          onClose={() => setFormItem(null)}
          onSaved={(saved) => {
            setFormItem(null)
            setSelectedId(saved.id)
            setReload((n) => n + 1)
          }}
        />
      )}
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onDone={() => setReload((n) => n + 1)} />}
    </div>
  )
}
