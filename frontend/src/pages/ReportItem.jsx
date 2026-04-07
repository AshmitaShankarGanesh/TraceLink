import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/api'
import { useToast } from '../components/ToastProvider'

function ReportItem() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    itemType: 'lost',
    title: '',
    description: '',
    category: '',
    tags: '',
    city: '',
    area: '',
    dateEvent: '',
  })
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { showToast } = useToast()

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleImageChange = (e) => {
    const selected = Array.from(e.target.files || []).slice(0, 5)
    setImages(selected)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim() || !form.city.trim()) {
      const msg = 'Title, description, and city are required'
      setError(msg)
      showToast(msg, 'error')
      return
    }
    setLoading(true)
    setError('')
    try {
      const payload = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        if (value) payload.append(key, typeof value === 'string' ? value.trim() : value)
      })
      images.forEach((file) => payload.append('images', file))

      const { data } = await api.post('/items', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      showToast('Item reported successfully', 'success')
      navigate(`/items/${data.data.item.id || data.data.item._id}`)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Unable to report item'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-black">Report an Item</h1>
        <p className="text-gray-600">Submit lost or found details to start matching.</p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="glass-card space-y-4 rounded-3xl p-6 shadow-xl shadow-gray-200/80"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <select
            name="itemType"
            value={form.itemType}
            onChange={handleChange}
            className="rounded-xl border border-gray-200 bg-white/85 px-4 py-3 text-sm outline-none ring-[#276EF1] focus:ring-2"
          >
            <option value="lost">Lost Item</option>
            <option value="found">Found Item</option>
          </select>
          <input
            name="title"
            required
            placeholder="Item title"
            value={form.title}
            onChange={handleChange}
            className="rounded-xl border border-gray-200 bg-white/85 px-4 py-3 text-sm outline-none ring-[#276EF1] focus:ring-2"
          />
        </div>

        <textarea
          name="description"
          required
          placeholder="Describe the item..."
          rows={5}
          value={form.description}
          onChange={handleChange}
          className="w-full rounded-xl border border-gray-200 bg-white/85 px-4 py-3 text-sm outline-none ring-[#276EF1] focus:ring-2"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <input
            name="category"
            placeholder="Category (wallet, phone...)"
            value={form.category}
            onChange={handleChange}
            className="rounded-xl border border-gray-200 bg-white/85 px-4 py-3 text-sm outline-none ring-[#276EF1] focus:ring-2"
          />
          <input
            name="tags"
            placeholder="Tags (comma separated)"
            value={form.tags}
            onChange={handleChange}
            className="rounded-xl border border-gray-200 bg-white/85 px-4 py-3 text-sm outline-none ring-[#276EF1] focus:ring-2"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <input
            name="city"
            required
            placeholder="City"
            value={form.city}
            onChange={handleChange}
            className="rounded-xl border border-gray-200 bg-white/85 px-4 py-3 text-sm outline-none ring-[#276EF1] focus:ring-2"
          />
          <input
            name="area"
            placeholder="Area / landmark"
            value={form.area}
            onChange={handleChange}
            className="rounded-xl border border-gray-200 bg-white/85 px-4 py-3 text-sm outline-none ring-[#276EF1] focus:ring-2"
          />
          <input
            name="dateEvent"
            type="date"
            value={form.dateEvent}
            onChange={handleChange}
            className="rounded-xl border border-gray-200 bg-white/85 px-4 py-3 text-sm outline-none ring-[#276EF1] focus:ring-2"
          />
        </div>

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          className="w-full rounded-xl border border-dashed border-gray-300 bg-white/70 px-4 py-3 text-sm"
        />
        <p className="text-xs text-gray-500">Upload up to 5 images.</p>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
        >
          {loading ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </section>
  )
}

export default ReportItem
