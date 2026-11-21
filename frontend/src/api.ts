export type Role = 'OWNER' | 'COUNTER' | 'STOREKEEPER'

export interface User {
  id: number
  username: string
  first_name: string
  last_name: string
  role: Role
}

const TOKEN_KEY = 'erp_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)

export const setToken = (token: string | null) => {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function errorMessage(res: Response): Promise<string> {
  const fallback = 'Something went wrong. Try again.'
  try {
    const body = await res.json()
    if (typeof body.detail === 'string') return body.detail
    const first = Object.entries(body)[0]
    if (first) {
      const [field, msg] = first
      const text = Array.isArray(msg) ? String(msg[0]) : String(msg)
      return `${field.replace(/_/g, ' ')}: ${text}`
    }
  } catch {
    /* keep fallback */
  }
  return fallback
}

function authHeaders(init: RequestInit): Headers {
  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, { ...init, headers: authHeaders(init) })
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res))
  return res.json() as Promise<T>
}

export async function apiBlob(path: string): Promise<Blob> {
  const res = await fetch(`/api${path}`, { headers: authHeaders({}) })
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res))
  return res.blob()
}
