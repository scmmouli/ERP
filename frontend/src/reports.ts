export interface LowItem {
  id: number
  part_number: string
  name: string
  stock: string
  reorder_level: number
}

export interface DashboardData {
  limited?: boolean
  today?: { total: string; count: number; change_pct: number | null }
  outstanding?: { total: string; overdue: string; customers: number }
  low_stock: { count: number; out_of_stock: number; items: LowItem[] }
  stock_value?: { amount: string; uncosted_items: number }
  last7?: { date: string; total: string }[]
  payment_mix?: { mode: string; total: string }[]
  top_movers?: { part_number: string; name: string; qty: string }[]
  top_debtors?: { id: number; name: string; outstanding: string; overdue: string }[]
}

export interface SalesReportData {
  from: string
  to: string
  kpis: {
    billed: string
    net_sales: string
    invoices: number
    avg_bill: string
    returns: string
    credit_sales: string
    gross_profit: string
    margin_pct: number | null
    uncosted_items: number
  }
  daily: { date: string; total: string }[]
  payment_mode: { mode: string; total: string; count: number }[]
  top_items: { part_number: string; name: string; qty: string; revenue: string; profit: string; margin_pct: number | null }[]
  by_brand: { brand: string; revenue: string }[]
  top_customers: { name: string; billed: string }[]
  by_staff: { user: string; total: string; count: number }[]
}

export const MODE_LABEL: Record<string, string> = { CASH: 'Cash', UPI: 'UPI', CREDIT: 'Credit' }
