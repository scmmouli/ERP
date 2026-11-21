import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth'
import type { Role } from '../api'

const NAV: { to: string; label: string; roles: Role[] }[] = [
  { to: '/', label: 'Dashboard', roles: ['OWNER', 'COUNTER', 'STOREKEEPER'] },
  { to: '/billing', label: 'Billing', roles: ['OWNER', 'COUNTER'] },
  { to: '/items', label: 'Items', roles: ['OWNER', 'COUNTER', 'STOREKEEPER'] },
  { to: '/purchase', label: 'Purchase', roles: ['OWNER', 'STOREKEEPER'] },
  { to: '/customers', label: 'Customers', roles: ['OWNER', 'COUNTER'] },
  { to: '/sales-report', label: 'Sales Report', roles: ['OWNER'] },
]

export default function Layout() {
  const { user, logout } = useAuth()
  if (!user) return null
  const initials = (user.first_name || user.username).slice(0, 2).toUpperCase()

  return (
    <div className="flex min-h-screen">
      <aside className="flex print:hidden w-52 flex-col gap-1 bg-[#0f1f36] px-3 py-5 text-[#c9d6ea]">
        <div className="px-2 pb-5 text-base font-bold text-white">Parts ERP</div>
        {NAV.filter((n) => n.roles.includes(user.role)).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2.5 font-medium ${isActive ? 'bg-[#1f5fbf] text-white' : 'hover:bg-[#1b3252]'}`
            }
          >
            {n.label}
          </NavLink>
        ))}
        <div className="mt-auto border-t border-[#29405f] px-2 pt-3 text-xs text-[#a9bad3]">Main Shop</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex print:hidden items-center justify-end gap-3 px-7 py-4">
          <span className="text-sm text-slate-600">{user.role.toLowerCase()}</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1f5fbf] text-sm font-bold text-white">
            {initials}
          </div>
          <button
            onClick={logout}
            className="rounded-lg border border-[#1f5fbf] bg-white px-3 py-1.5 text-sm font-semibold text-[#1b4f9c]"
          >
            Sign out
          </button>
        </header>
        <main className="flex-1 px-7 pb-8 print:px-0 print:pb-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
