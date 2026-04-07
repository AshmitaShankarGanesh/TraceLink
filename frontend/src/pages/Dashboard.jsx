import { useEffect, useState } from 'react'
import api from '../api/api'
import ItemCard from '../components/ItemCard'
import LoadingSkeleton from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/ToastProvider'

function Dashboard() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({
    totalItems: 0,
    claims: 0,
    matches: 0,
  })
  const { showToast } = useToast()
  const [filters, setFilters] = useState({
    q: '',
    itemType: '',
  })

  const fetchItems = async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filters.q.trim()) params.q = filters.q.trim()
      if (filters.itemType) params.itemType = filters.itemType

      const [itemsRes, totalRes, claimsRes, closedRes, matchedRes] = await Promise.all([
        api.get('/items', { params }),
        api.get('/items', { params: { limit: 1 } }),
        api.get('/claims/my'),
        api.get('/items', { params: { status: 'closed', limit: 1 } }),
        api.get('/items', { params: { status: 'matched', limit: 1 } }),
      ])

      const data = itemsRes.data
      setItems(data.data.items || [])
      setStats({
        totalItems: totalRes.data.data.pagination?.total || 0,
        claims: (claimsRes.data.data.claims || []).length,
        matches:
          (closedRes.data.data.pagination?.total || 0) +
          (matchedRes.data.data.pagination?.total || 0),
      })
    } catch (err) {
      const msg = err?.response?.data?.message || 'Unable to load items'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const applyFilters = (e) => {
    e.preventDefault()
    fetchItems()
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-black sm:text-4xl">
          Lost & Found Dashboard
        </h1>
        <p className="text-gray-600">Discover reported items and smart matches instantly.</p>
      </header>

      <form
        onSubmit={applyFilters}
        className="glass-card grid gap-3 rounded-2xl p-4 shadow-md sm:grid-cols-[1fr_180px_auto]"
      >
        <input
          name="q"
          placeholder="Search by keyword..."
          value={filters.q}
          onChange={handleFilterChange}
          className="rounded-xl border border-gray-200 bg-white/90 px-4 py-3 text-sm outline-none ring-[#276EF1] focus:ring-2"
        />
        <select
          name="itemType"
          value={filters.itemType}
          onChange={handleFilterChange}
          className="rounded-xl border border-gray-200 bg-white/90 px-3 py-3 text-sm outline-none ring-[#276EF1] focus:ring-2"
        >
          <option value="">All Types</option>
          <option value="lost">Lost</option>
          <option value="found">Found</option>
        </select>
        <button
          type="submit"
          className="rounded-xl bg-[#276EF1] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
        >
          Apply
        </button>
      </form>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="glass-card rounded-2xl p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total Items</p>
          <p className="mt-1 text-2xl font-semibold text-black">{stats.totalItems}</p>
        </article>
        <article className="glass-card rounded-2xl p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">My Claims</p>
          <p className="mt-1 text-2xl font-semibold text-black">{stats.claims}</p>
        </article>
        <article className="glass-card rounded-2xl p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total Matches</p>
          <p className="mt-1 text-2xl font-semibold text-black">{stats.matches}</p>
        </article>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <LoadingSkeleton count={6} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.length ? (
            items.map((item) => <ItemCard key={item.id || item._id} item={item} />)
          ) : (
            <EmptyState
              title="No items found"
              message="Try changing search keywords or filters to discover more reports."
            />
          )}
        </div>
      )}
    </section>
  )
}

export default Dashboard
