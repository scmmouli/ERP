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

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`/api${path}`, { ...init, headers })
  if (!res.ok) {
    let message = 'Something went wrong. Try again.'
    try {
      const body = await res.json()
      message = body.detail ?? message
    } catch {
      /* keep default message */
    }
    throw new ApiError(res.status, message)
  }
  return res.json() as Promise<T>
}
