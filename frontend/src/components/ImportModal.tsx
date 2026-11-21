import { useState } from 'react'
import { api, apiBlob } from '../api'
import Modal from './Modal'

interface Result {
  created: number
  updated: number
  failed: number
  errors: { row: number; message: string }[]
}

export default function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const downloadTemplate = async () => {
    try {
      const url = URL.createObjectURL(await apiBlob('/catalog/import/template/'))
      const a = document.createElement('a')
      a.href = url
      a.download = 'item_import_template.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download the template.')
    }
  }

  const upload = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      setResult(await api<Result>('/catalog/import/', { method: 'POST', body: fd }))
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Import items from Excel" onClose={onClose}>
      <p className="mb-3 text-sm text-slate-600">
        Use the template so the columns match. Parts that already exist (same part number) are updated, not duplicated.
      </p>
      <button onClick={downloadTemplate} className="mb-4 rounded-lg border border-[#1f5fbf] px-3 py-2 text-sm font-semibold text-[#1b4f9c]">
        Download template
      </button>

      <label htmlFor="xlsx" className="mb-1 block text-sm font-semibold">Excel file (.xlsx)</label>
      <input id="xlsx" type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mb-4 block w-full text-sm" />

      {error && <p role="alert" className="mb-3 text-sm font-semibold text-red-800">{error}</p>}

      {result && (
        <div className="mb-4 rounded-lg bg-slate-100 p-3 text-sm">
          <p className="font-semibold">
            {result.created} added, {result.updated} updated, {result.failed} failed.
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 max-h-40 list-disc overflow-y-auto pl-5 text-red-800">
              {result.errors.map((e) => <li key={e.row}>Row {e.row}: {e.message}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-[#1f5fbf] px-4 py-2 font-semibold text-[#1b4f9c]">Close</button>
        <button onClick={upload} disabled={!file || busy} className="rounded-lg bg-[#1f5fbf] px-4 py-2 font-semibold text-white disabled:opacity-60">
          {busy ? 'Importing…' : 'Import'}
        </button>
      </div>
    </Modal>
  )
}
