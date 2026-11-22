import { apiBlob } from './api'

export async function downloadFile(path: string, filename: string) {
  const url = URL.createObjectURL(await apiBlob(path))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
