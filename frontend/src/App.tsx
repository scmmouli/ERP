import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Items from './pages/Items'
import Placeholder from './pages/Placeholder'
import Purchase from './pages/Purchase'
import Billing from './pages/Billing'
import Customers from './pages/Customers'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8 text-slate-600">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="billing" element={<Billing />} />
        <Route path="items" element={<Items />} />
        <Route path="purchase" element={<Purchase />} />
        <Route path="customers" element={<Customers />} />
        <Route path="sales-report" element={<Placeholder title="Sales Report" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
