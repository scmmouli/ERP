import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Item, Page } from '../catalog'
import StockBadge from './StockBadge'

export default function PartPicker({ onPick }: { onPick: (item: Item) => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Item[]>([])

  useEffect(() => {
    if (!q.trim()) return
    const t = setTimeout(() => {
      api<Page<Item>>(`/catalog/items/?q=${encodeURIComponent(q)}`)
        .then((d) => setResults(d.results.slice(0, 8)))
        .catch(() => setResults([]))
    }, 200)
    return () => clearTimeout(t)
  }, [q])

  const shown = q.trim() ? results : []
  const pick = (i: Item) => {
    onPick(i)
    setQ('')
  }

  return (
    <div className="relative">
      <input
        aria-label="Search part to add"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && shown[0] && (e.preventDefault(), pick(shown[0]))}
        placeholder="Search part number or name to add…  (Enter adds the first match)"
        className="w-full rounded-xl border-2 border-[#1f5fbf] bg-white px-4 py-3"
      />
      {shown.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-300 bg-white shadow-lg">
          {shown.map((i) => (
            <li key={i.id}>
              <button type="button" onClick={() => pick(i)} className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-blue-50">
                <span><span className="font-semibold">{i.part_number}</span> <span className="text-slate-600">{i.name}</span></span>
                <StockBadge item={i} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
