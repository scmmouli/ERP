export interface Bucket {
  current: string
  d31_60: string
  d61_90: string
  d90_plus: string
}

export interface OpenInvoice {
  id: number
  number: string
  date: string
  total: string
  open: string
  days: number
  overdue: boolean
}

export interface StatementEntry {
  at: string
  kind: 'BILL' | 'RECEIPT' | 'RETURN'
  ref: string
  text: string
  debit: string
  credit: string
  balance: string
}

export interface Statement {
  customer: { id: number; name: string; phone: string; kind: string; gstin: string; state_code: string; address: string; credit_limit: string }
  outstanding: string
  advance: string
  overdue: string
  buckets: Bucket
  open_invoices: OpenInvoice[]
  entries: StatementEntry[]
}
