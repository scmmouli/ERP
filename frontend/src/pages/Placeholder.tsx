export default function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="mt-6 rounded-2xl border border-dashed border-slate-400 bg-white p-6 text-slate-600">
        This screen is built in a later drop.
      </div>
    </div>
  )
}
