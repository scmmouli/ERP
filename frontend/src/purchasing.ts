export interface Supplier {
  id: number
  name: string
  phone: string
  gstin: string
  address: string
}

export interface GRNLine {
  id: number
  item: number
  part_number: string
  item_name: string
  qty_ordered: string | null
  qty_received: string
  unit_cost: string
  gst_rate: string
}

export interface GRN {
  id: number
  number: string
  supplier: number
  supplier_name: string
  supplier_invoice_no: string
  supplier_invoice_date: string | null
  status: 'DRAFT' | 'POSTED'
  notes: string
  lines: GRNLine[]
  taxable: string
  gst: string
  total: string
  created_at: string
}

export const money = (v: number | string) =>
  `₹ ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
