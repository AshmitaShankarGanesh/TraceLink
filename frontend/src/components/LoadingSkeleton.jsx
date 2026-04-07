function LoadingSkeleton({ count = 3 }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="h-40 rounded-xl bg-gray-200" />
          <div className="mt-4 h-5 w-2/3 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-full rounded bg-gray-100" />
          <div className="mt-2 h-4 w-5/6 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

export default LoadingSkeleton

