function MatchCard({ match }) {
  const badgeClasses =
    match.matchCategory === 'High'
      ? 'bg-emerald-100 text-emerald-700'
      : match.matchCategory === 'Medium'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-gray-200 text-gray-700'

  const confidence =
    match.score >= 80 ? 'Very High' : match.score >= 70 ? 'High' : match.score >= 50 ? 'Medium' : 'Low'
  const confidenceColor =
    match.score >= 80
      ? 'text-emerald-700'
      : match.score >= 70
        ? 'text-blue-700'
        : match.score >= 50
          ? 'text-amber-700'
          : 'text-gray-600'

  return (
    <article className="glass-card rounded-2xl p-4 shadow-md shadow-gray-200/70">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h4 className="text-base font-semibold text-black">{match.item.title}</h4>
          <p className="text-sm text-gray-600">
            {match.item.location?.city}
            {match.item.location?.area ? `, ${match.item.location.area}` : ''}
          </p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClasses}`}>
          {match.matchCategory}
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-gray-700">
          Match Score: <span className="font-semibold text-black">{match.score}%</span>
        </p>
        <p className={`text-xs font-semibold ${confidenceColor}`}>
          Confidence: {confidence}
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-[#276EF1]"
            style={{ width: `${Math.min(100, Math.max(0, match.score))}%` }}
          />
        </div>
      </div>
    </article>
  )
}

export default MatchCard
