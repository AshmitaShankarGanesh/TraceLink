import api from '../api/api'

function ClaimList({ claims, isOwner, onUpdated, onError, onSuccess }) {
  if (!isOwner) {
    return null
  }

  const handleUpdate = async (id, status) => {
    try {
      await api.put(`/claims/${id}`, { status })
      onSuccess?.(`Claim ${status}`)
      onUpdated?.()
    } catch (err) {
      onError?.(err?.response?.data?.message || 'Unable to update claim')
    }
  }

  if (!claims.length) {
    return (
      <p className="text-sm text-gray-500">
        No claims yet. When users submit claims, they will appear here.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {claims.map((claim) => (
        <article
          key={claim._id}
          className="glass-card flex items-start justify-between gap-4 rounded-2xl p-4 shadow-md"
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold text-black">
              {claim.claimantId?.name || 'Unknown user'}{' '}
              <span className="text-xs text-gray-500">({claim.claimantId?.email})</span>
            </p>
            {claim.message ? (
              <p className="text-sm text-gray-700">{claim.message}</p>
            ) : (
              <p className="text-xs text-gray-500">No message provided.</p>
            )}
            <p className="text-xs text-gray-500">
              Status: <span className="font-medium capitalize">{claim.status}</span>
            </p>
          </div>
          {claim.status === 'pending' ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleUpdate(claim._id, 'approved')}
                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => handleUpdate(claim._id, 'rejected')}
                className="rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
              >
                Reject
              </button>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  )
}

export default ClaimList

