export interface SalesConfig {
  shop_name: string
  shop_state_code: string
  prices_include_gst: boolean
  counter_max_discount_percent: number
}

export interface Customer {
  id: number
  name: string
  phone: string
  kind: string
  gstin: string
  state_code: string
  address: string
  credit_limit: string
  outstanding?: string
}

export interface InvLine {
  id: number
  part_number: string
  item_name: string
  hsn_code: string
  qty: string
  rate: string
  discount: string
  gst_rate: string
  taxable: string
  cgst: string
  sgst: string
  igst: string
  amount: string
  returned_qty: string
}

export interface Invoice {
  id: number
  number: string
  customer: { id: number; name: string; phone: string; gstin: string; state_code: string; address: string } | null
  payment_mode: 'CASH' | 'UPI' | 'CREDIT'
  inter_state: boolean
  subtotal: string
  cgst: string
  sgst: string
  igst: string
  round_off: string
  total: string
  paid: string
  due: string
  lines: InvLine[]
  returns: { id: number; number: string; credit_amount: string; created_at: string }[]
  user: string
  created_at: string
  shop: { name: string; gstin: string; address: string; phone: string }
}

const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100

/** On-screen preview only. The server calculates the real bill. */
export function calcLine(qty: number, rate: number, discount: number, gstRate: number, inclusive: boolean, inter: boolean) {
  const afterDiscount = r2(qty * rate) - discount
  let taxable = afterDiscount
  let gst: number
  if (inclusive) {
    taxable = r2((afterDiscount * 100) / (100 + gstRate))
    gst = r2(afterDiscount - taxable)
  } else {
    gst = r2((taxable * gstRate) / 100)
  }
  const cgst = inter ? 0 : r2(gst / 2)
  return { taxable, cgst, sgst: inter ? 0 : r2(gst - cgst), igst: inter ? gst : 0, amount: r2(taxable + gst) }
}
