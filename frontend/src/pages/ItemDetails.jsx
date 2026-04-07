import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/api'
import MatchCard from '../components/MatchCard'
import ClaimModal from '../components/ClaimModal'
import ClaimList from '../components/ClaimList'
import LoadingSkeleton from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/ToastProvider'

function ItemDetails() {
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [myClaims, setMyClaims] = useState([])
  const [itemClaims, setItemClaims] = useState([])
  const { showToast } = useToast()

  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('tracelink_user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])

  const isOwner = useMemo(() => {
    if (!item || !currentUser) return false
    const reportedId = item.reportedBy?.id || item.reportedBy?._id || item.reportedBy
    return String(reportedId) === String(currentUser.id || currentUser._id)
  }, [item, currentUser])

  const loadDetailsAndMatches = async () => {
    setLoading(true)
    setError('')
    try {
      const [itemRes, matchRes] = await Promise.all([
        api.get(`/items/${id}`),
        api.get(`/items/match/${id}`),
      ])
      setItem(itemRes.data.data.item)
      setMatches(matchRes.data.data.matches || [])
    } catch (err) {
      const msg = err?.response?.data?.message || 'Unable to load item details'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadClaims = async () => {
    if (!currentUser) return
    try {
      const [myRes, ownerRes] = await Promise.all([
        api.get('/claims/my'),
        isOwner ? api.get(`/claims/item/${id}`) : Promise.resolve({ data: { data: { claims: [] } } }),
      ])

      const allMy = myRes.data.data.claims || []
      setMyClaims(allMy.filter((c) => String(c.itemId?._id || c.itemId) === String(id)))

      setItemClaims(isOwner ? ownerRes.data.data.claims || [] : [])
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load claims', err)
    }
  }

  useEffect(() => {
    loadDetailsAndMatches()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    loadClaims()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isOwner])

  if (loading) return <LoadingSkeleton count={2} />
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!item) return null

  const myClaimStatus = myClaims[0]?.status

  return (
    <section className="space-y-6">
      <article className="glass-card rounded-3xl p-6 shadow-xl shadow-gray-200/80">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-black">{item.title}</h1>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              item.itemType === 'lost' ? 'bg-black text-white' : 'bg-[#276EF1]/10 text-[#276EF1]'
            }`}
          >
            {item.itemType?.toUpperCase()}
          </span>
        </div>

        <p className="text-gray-700">{item.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(item.tags || []).map((tag) => (
            <span key={tag} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
              #{tag}
            </span>
          ))}
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>
            Location: {item.location?.city}
            {item.location?.area ? `, ${item.location.area}` : ''}
          </p>
          <p>Status: {item.status}</p>
        </div>

        {!isOwner && item.status !== 'closed' ? (
          <div className="mt-6 space-y-2">
            <button
              type="button"
              onClick={() => setShowClaimModal(true)}
              className="rounded-xl bg-[#276EF1] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
            >
              {myClaimStatus ? 'Update Claim' : 'Claim Item'}
            </button>
            {myClaimStatus ? (
              <p className="text-xs text-gray-600">
                Your claim status:{' '}
                <span className="font-semibold capitalize">{myClaimStatus}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        {isOwner ? (
          <div className="mt-6 space-y-3">
            <h2 className="text-lg font-semibold text-black">Incoming Claims</h2>
            <ClaimList
              claims={itemClaims}
              isOwner={isOwner}
              onUpdated={loadClaims}
              onSuccess={(msg) => showToast(msg, 'success')}
              onError={(msg) => showToast(msg, 'error')}
            />
          </div>
        ) : null}
      </article>

      <section>
        <h2 className="mb-3 text-2xl font-semibold text-black">Top Matches</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {matches.length ? (
            matches.map((match) => (
              <MatchCard key={match.item.id || match.item._id} match={match} />
            ))
          ) : (
            <EmptyState
              title="No matches yet"
              message="Keep the report active. We continuously compare new items."
            />
          )}
        </div>
      </section>

      <ClaimModal
        open={showClaimModal}
        itemId={id}
        onClose={() => setShowClaimModal(false)}
        onSubmitted={loadClaims}
      />
    </section>
  )
}

export default ItemDetails
