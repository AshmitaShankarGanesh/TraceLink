function EmptyState({ title, message }) {
  return (
    <div className="glass-card rounded-2xl border border-dashed border-gray-200 p-8 text-center">
      <p className="text-lg font-semibold text-black">{title}</p>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
    </div>
  )
}

export default EmptyState

