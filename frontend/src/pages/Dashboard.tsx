import { useAuth } from '../auth'

export default function Dashboard() {
  const { user } = useAuth()
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-slate-600">Signed in as {user?.username} ({user?.role.toLowerCase()}).</p>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        Foundation is running. Sales, outstanding and stock widgets arrive in a later drop.
      </div>
    </div>
  )
}
