import { useState } from 'react'
import api from '../api/api'
import { useToast } from './ToastProvider'

function ClaimModal({ open, onClose, itemId, onSubmitted }) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { showToast } = useToast()

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await api.post('/claims', { itemId, message })
      setSuccess('Claim submitted successfully.')
      showToast('Claim submitted successfully', 'success')
      setMessage('')
      onSubmitted?.()
    } catch (err) {
      const msg = err?.response?.data?.message || 'Unable to submit claim'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="glass-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-black">Claim this item</h3>
        <p className="mt-1 text-sm text-gray-600">
          Describe why you believe this item belongs to you. The owner will review your request.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <textarea
            rows={4}
            placeholder="Add any proof or details..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white/85 px-3 py-2 text-sm outline-none ring-[#276EF1] focus:ring-2"
          />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#276EF1] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
            >
              {loading ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ClaimModal

