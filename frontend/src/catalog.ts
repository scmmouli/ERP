export interface CrossRef {
  id: number
  alt_part_number: string
  kind: string
}

export interface Vehicle {
  id: number
  make: string
  model: string
  variant: string
}

export interface Item {
  id: number
  part_number: string
  name: string
  brand: string
  is_oem: boolean
  hsn_code: string
  gst_rate: string
  uom: string
  mrp: string
  sale_price: string
  rack: string
  reorder_level: number
  barcode: string
  stock?: string
  cross_refs: CrossRef[]
  fitments: { id: number; vehicle: Vehicle }[]
}

export interface Page<T> {
  count: number
  results: T[]
}

export const rupees = (v: string | number) => `₹ ${Number(v).toLocaleString('en-IN')}`

export const vehicleLabel = (v: Vehicle) => [v.make, v.model, v.variant].filter(Boolean).join(' ')
