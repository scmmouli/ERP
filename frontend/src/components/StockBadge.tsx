import type { Item } from '../catalog'

export default function StockBadge({ item }: { item: Item }) {
  const n = Number(item.stock ?? 0)
  const low = item.reorder_level > 0 && n <= item.reorder_level
  const label = n <= 0 ? 'Out of stock' : low ? `${n} Low` : `${n}`
  const cls = n <= 0 ? 'bg-red-100 text-red-900' : low ? 'bg-amber-100 text-amber-900' : 'bg-green-100 text-green-900'
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
}
