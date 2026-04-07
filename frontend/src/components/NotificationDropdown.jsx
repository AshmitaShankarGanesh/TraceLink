import { useNavigate } from 'react-router-dom'
import api from '../api/api'

function NotificationDropdown({ open, notifications, loading, onMarkedRead, onClose }) {
  const navigate = useNavigate()

  if (!open) return null

  const handleClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await api.put(`/notifications/${notification._id}/read`)
        onMarkedRead?.(notification._id)
      }

      if (notification.relatedItemId) {
        navigate(`/items/${notification.relatedItemId}`)
        onClose?.()
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to mark notification read', err)
    }
  }

  return (
    <div className="absolute right-0 z-30 mt-2 w-80 rounded-2xl bg-white/95 shadow-xl ring-1 ring-black/5">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-semibold text-black">Notifications</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-gray-800"
        >
          Close
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto border-t border-gray-100">
        {loading ? (
          <p className="px-4 py-3 text-xs text-gray-500">Loading...</p>
        ) : notifications.length === 0 ? (
          <p className="px-4 py-3 text-xs text-gray-500">No notifications yet.</p>
        ) : (
          notifications.map((n) => (
            <button
              key={n._id}
              type="button"
              onClick={() => handleClick(n)}
              className={`flex w-full flex-col items-start px-4 py-3 text-left text-xs transition hover:bg-gray-50 ${
                n.isRead ? 'bg-white' : 'bg-[#276EF1]/5'
              }`}
            >
              <span className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {n.type === 'MATCH_FOUND' ? 'Match Found' : 'Claim Update'}
              </span>
              <span className="text-[13px] text-gray-800">{n.message}</span>
              <span className="mt-1 text-[10px] text-gray-500">
                {new Date(n.createdAt).toLocaleString()}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export default NotificationDropdown

